import {
  Object3D,
  Vector3,
  Scene,
  LoaderUtils,
  WebGLRenderer,
  PerspectiveCamera,
  PolarGridHelper,
  HemisphereLight,
  PointLight,
  Mesh,
  SphereGeometry,
  Color,
  MeshBasicMaterial,
  LoadingManager,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Raycaster,
  Vector2,
} from "three";

//Imports for managing objects and physics
import { initCannon } from "./physics";

// In ROS models Z points upwards
Object3D.DefaultUp = new Vector3(0, 0, 1);

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

import { XacroLoader } from "xacro-parser";
import URDFLoader from "urdf-loader";

import { default as IKSolver } from "./ik/ccdik";
//import { default as IKSolver } from "./ik/fabrik"
import Simulation from "./simulation";
import { canHover } from "../helpers";

const path = require("path");

let robot;
robot = require("./robots/franka");

let container;
let camera, scene, renderer;
let raycaster;
let pointerDownPixels = new Vector2();
let pointerXY = new Vector2();
let pointerDrag = false;

let tcptarget, groundLine;
let cameraControl, robotControl;
let simObjectActive = false;
let ik;

const renderCallbacks = [];

loadRobotModel(robot.xacro).then(
  (model) => {
    robot.init(model);
    robot.setPose(robot.defaultPose);

    initScene();
    initCannon();

    ik = new IKSolver(scene, robot);
    Simulation.init(robot, ik, ikRender);
  },
  (reason) => {
    console.log(reason);
  }
);

function loadRobotModel(url) {
  return new Promise((resolve, reject) => {
    const xacroLoader = new XacroLoader();
    xacroLoader.inOrder = true;
    xacroLoader.requirePrefix = true;
    xacroLoader.localProperties = true;

    xacroLoader.rospackCommands.find = (...args) => {
      return path.join(robot.robotRoot, ...args);
    };

    for (let cmd in robot.rosMacros) {
      xacroLoader.rospackCommands[cmd] = robot.rosMacros[cmd];
    }

    xacroLoader.load(
      url,
      (xml) => {
        if (xml.documentElement.nodeName === "parsererror") {
          console.log("Parser error, invalid XML:", xml);
          reject("Failed to load XML, received parser error.");
          return;
        }

        let manager = new LoadingManager();
        const urdfLoader = new URDFLoader(manager);
        urdfLoader.packages = robot.packages; // Ensure this maps correctly
        urdfLoader.workingPath = LoaderUtils.extractUrlBase(url);

        try {
          let model = urdfLoader.parse(xml);
          model.rotateX(-Math.PI / 2);
          model.position.y -= 3;
          resolve(model);
        } catch (error) {
          console.log("Failed to parse URDF:", error);
          reject(error);
        }
      },
      (error) => {
        console.log("Error loading Xacro file:", error);
        reject(error);
      }
    );
  });
}

function initScene() {
  container = document.getElementById("viewer");

  scene = new Scene();
  scene.background = new Color(0xc0d0fc);

  // Camera
  camera = new PerspectiveCamera(
    35,
    container.clientWidth / container.clientHeight,
    1,
    2000
  );

  camera.position.set(8, 15, 17);
  camera.lookAt(0, 0, 10);

  // Grid
  const grid = new PolarGridHelper(12, 16, 8, 64, 0x888888, 0xaaaaaa);
  grid.position.y -= 3;
  scene.add(grid);

  // Robot
  scene.add(robot.model);

  // Lights
  const light = new HemisphereLight(0xffeeee, 0x111122, 3);
  scene.add(light);

  const pointLight = new PointLight(0xffffff, 2);
  pointLight.position.set(30, 30, 50);
  scene.add(pointLight);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.sortObjects = false;

  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Scene controls
  cameraControl = new OrbitControls(camera, renderer.domElement);
  cameraControl.damping = 0.2;
  cameraControl.addEventListener("change", render);

  // TCP target & controls
  tcptarget = new Mesh(
    new SphereGeometry(2),
    new MeshBasicMaterial({
      visible: false,
    })
  );
  robot.tcp.object.getWorldPosition(tcptarget.position);
  scene.add(tcptarget);

  let lineVertices = [];
  lineVertices.push(tcptarget.position.clone());
  lineVertices.push(tcptarget.position.clone().setZ(0));
  let lineGeometry = new BufferGeometry().setFromPoints(lineVertices);
  groundLine = new Line(
    lineGeometry,
    new LineBasicMaterial({
      color: 0xaaaacc,
    })
  );
  groundLine.name = "groundLine";
  scene.add(groundLine);

  robotControl = new TransformControls(camera, renderer.domElement);
  robotControl.setSize(canHover() ? 1.7 : 3);
  robotControl.addEventListener("change", (evt) =>
    requestAnimationFrame(render)
  );
  robotControl.addEventListener("objectChange", onTargetChange);
  robotControl.addEventListener(
    "dragging-changed",
    (evt) => (cameraControl.enabled = !evt.value)
  );

  // TODO setMode('rotate') on click event
  robotControl.attach(tcptarget);
  scene.add(robotControl);

  robotControl.visible = false;
  robotControl.enabled = false;
  raycaster = new Raycaster();
  enablePointerEvents();
}

function onTargetChange() {
  // Prevent target from going beneath the floor
  tcptarget.position.z = Math.max(0, tcptarget.position.z);
  updateGroundLine();

  if (!ik) {
    console.log("IK solver not initialized yet.");
    return; // Exit the function if ik is not ready
  }

  // Do the IK if the target has been moved
  ik.solve(tcptarget, robot, robot.ikEnabled, {
    // we don't have to be all that precise here
    maxIterations: 3,
    stopDistance: 0.1,
    jointLimits: robot.interactionJointLimits,
    apply: true,
  });

  // requestAnimationFrame is called in the transformControl's change-listener,
  // so we can skip it here
}

function ikRender() {
  robot.tcp.object.getWorldPosition(tcptarget.position);
  robot.tcp.object.getWorldQuaternion(tcptarget.quaternion);
  updateGroundLine();
  requestAnimationFrame(render);
}

function updateGroundLine() {
  const geom = groundLine.geometry;
  const position = geom.attributes.position;
  position.setXYZ(
    0,
    tcptarget.position.x,
    tcptarget.position.y,
    tcptarget.position.z
  );
  position.setXYZ(1, tcptarget.position.x, tcptarget.position.y, 0);
  position.needsUpdate = true;
}

function render() {
  renderer.render(scene, camera);

  for (let cb of renderCallbacks) {
    cb(robot);
  }
}

export function enablePointerEvents() {
  if (canHover()) {
    container.addEventListener("pointermove", onHoverPointerMove);
    container.addEventListener("pointerdown", onHoverPointerDown);
    container.addEventListener("pointerup", onHoverPointerUp);
  } else {
    container.addEventListener("pointermove", onClickPointerMove);
    container.addEventListener("pointerdown", onClickPointerDown);
    container.addEventListener("pointerup", onClickPointerUp);
  }
}

function onHoverPointerMove(evt) {
  evt.preventDefault();
  pointerDrag = true;

  pointerXY.x = (evt.offsetX / container.clientWidth) * 2 - 1;
  pointerXY.y = -(evt.offsetY / container.clientHeight) * 2 + 1;

  raycaster.setFromCamera(pointerXY, camera);
  let showRTC = false;

  // Only show the robot controls if no object is visible
  if (!simObjectActive) {
    const intersections = raycaster.intersectObjects([tcptarget]);
    showRTC = intersections.length > 0;
  }

  if (showRTC !== robotControl.visible) {
    robotControl.visible = showRTC;
    robotControl.enabled = showRTC;
  }

  requestAnimationFrame(render);
}

function onHoverPointerDown(evt) {
  pointerDrag = false;
  pointerDownPixels.x = evt.offsetX;
  pointerDownPixels.y = evt.offsetY;
}

function onHoverPointerUp(evt) {
  // Don't change transform controls if the pointer was dragged at least (5) pixels
  if (
    pointerDrag ||
    new Vector2(evt.offsetX, evt.offsetY).sub(pointerDownPixels).length() > 5
  ) {
    return;
  }
  requestAnimationFrame(render);
}

function onClickPointerMove(evt) {
  evt.preventDefault();
  pointerDrag = true;
  requestAnimationFrame(render);
}

function onClickPointerDown(evt) {
  pointerDrag = false;
  pointerDownPixels.x = evt.offsetX;
  pointerDownPixels.y = evt.offsetY;
}

function onClickPointerUp(evt) {
  // Don't do anything if the pointer was dragged at least (5) pixels
  if (
    pointerDrag ||
    new Vector2(evt.offsetX, evt.offsetY).sub(pointerDownPixels).length() > 5
  ) {
    return;
  }

  pointerXY.x = (evt.offsetX / container.clientWidth) * 2 - 1;
  pointerXY.y = -(evt.offsetY / container.clientHeight) * 2 + 1;
  raycaster.setFromCamera(pointerXY, camera);

  let showRTC = false;

  if (showRTC !== robotControl.visible) {
    robotControl.visible = showRTC;
    robotControl.enabled = showRTC;
  }

  requestAnimationFrame(render);
}

//Functions for access to the scene and the robot model
export function requestAF() {
  requestAnimationFrame(render);
}

export function getScene() {
  return scene;
}

export function getRobot() {
  return robot;
}

export function getControl() {
  const contObj = {
    camera: camera,
    orbitControls: cameraControl,
    renderer: renderer,
  };
  return contObj;
}

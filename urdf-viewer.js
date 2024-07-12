var $lsnuL$three = require("three");
var $lsnuL$urdfloader = require("urdf-loader");
var $lsnuL$threeexamplesjsmcontrolsOrbitControls = require("three/examples/jsm/controls/OrbitControls");


function $parcel$interopDefault(a) {
  return a && a.__esModule ? a.default : a;
}



document.addEventListener("DOMContentLoaded", function() {
    const viewer = document.getElementById("viewer");
    if (!viewer) return;
    const scene = new $lsnuL$three.Scene();
    scene.background = new $lsnuL$three.Color(0xcee6f0);
    const camera = new $lsnuL$three.PerspectiveCamera(75, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);
    const renderer = new $lsnuL$three.WebGLRenderer({
        antialias: true
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = $lsnuL$three.PCFSoftShadowMap;
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    viewer.appendChild(renderer.domElement);
    const directionalLight = new $lsnuL$three.DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.position.set(5, 30, 5);
    scene.add(directionalLight);
    const ambientLight = new $lsnuL$three.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    const ground = new $lsnuL$three.Mesh(new $lsnuL$three.PlaneGeometry(100, 100), new $lsnuL$three.ShadowMaterial({
        opacity: 0.25
    }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const controls = new (0, $lsnuL$threeexamplesjsmcontrolsOrbitControls.OrbitControls)(camera, renderer.domElement);
    controls.minDistance = 4;
    controls.target.y = 1;
    controls.update();
    const manager = new $lsnuL$three.LoadingManager();
    const loader = new (0, ($parcel$interopDefault($lsnuL$urdfloader)))(manager);
    let robot;
    loader.load("urdf/urdf.urdf", function(result) {
        robot = result;
        robot.rotation.x = Math.PI * -0.5;
        robot.traverse(function(c) {
            c.castShadow = true;
        });
        robot.updateMatrixWorld(true);
        const bb = new $lsnuL$three.Box3().setFromObject(robot);
        robot.position.y -= bb.min.y;
        scene.add(robot);
    });
    manager.onLoad = ()=>{
    // Handle completed loading if needed
    };
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
    window.onunload = ()=>{
        scene.clear();
        renderer.dispose();
        viewer.removeChild(renderer.domElement);
    };
});


//# sourceMappingURL=urdf-viewer.js.map

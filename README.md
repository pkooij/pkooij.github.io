Personal website of Pepijn Kooijmans

Goal is to keep the site as simple as possible, initially only used css and html, for urdf viewer also js was needed.

To build: `npx parcel build index.js` + copy static folder franka_description to dist manually!!
To start dev server: `npx parcel index.html` + copy static folder franka_description to dist manually!!
To deploy to github pages: `npm run deploy`

Robot model by Franka Emika available under the Apache License 2.0. https://github.com/frankaemika/franka_ros. Modifications were made to the original model.

Robot simulator by Nikolas Dahn from https://github.com/ndahn/Rocksi/tree, available under the MIT License. Modifications were made to the original code.

// Constants and global variables
const PLANET_TILT = latlngDeg2rad(20);
const PLANET_RADIUS = 6378;
const CLOUDS_SCALE = 1.04;
const HEIGHT = 700;
const WIDTH = 700;

let rotationSpeed = 0.3;
let camera, controls, scene, renderer, meshPlanet, meshClouds;
let curZoom = 100;
let markerGeom, markerMaterial;

// Initialization
function init() {
    setupScene();
    setupRenderer();
    setupCamera();
    setupControls();
    setupLights();
    createPlanet();
    setupMarkers();
    setupEventListeners();
}

function setupScene() {
    scene = new THREE.Scene();
}

function setupRenderer() {
    renderer = new THREE.WebGLRenderer({
        clearAlpha: 0,
        clearColor: 0x000000,
        antialias: true
    });
    renderer.setSize(WIDTH, HEIGHT);
    renderer.sortObjects = true;
    renderer.autoClear = false;
    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    const container = document.getElementById('container');
    container.appendChild(renderer.domElement);
}

function setupCamera() {
    camera = new THREE.PerspectiveCamera(25, WIDTH / HEIGHT, 50, 1e7);
    camera.position.z = PLANET_RADIUS * 7;
    scene.add(camera);
}

function setupControls() {
    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 0.3;
    controls.noZoom = false;
    controls.noPan = true;
    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.4;
}

function setupLights() {
    const dirLight = new THREE.DirectionalLight(0xFFFFFF);
    dirLight.position.set(1, 0, 1).normalize();
    scene.add(dirLight);

    const camLight = new THREE.DirectionalLight(0xffffff);
    camera.add(camLight);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambientLight);
}

function createPlanet() {
    const planet = new cpPlanet({
        planet_radius: PLANET_RADIUS,
        planet_tilt_rad: PLANET_TILT,
        planet_cloud_texture: "textures/cloud.png",
        planet_surface_texture: "textures/earth_surface.jpg",
        planet_normals_texture: "textures/earth_normals.jpg",
        planet_specular_texture: "textures/earth_specular.jpg",
        planet_geom_segments: 64,
        planet_geom_rings: 64,
        use_surface_shader: true,
        create_combined_mesh: false
    });

    meshPlanet = planet.surface_mesh;
    scene.add(meshPlanet);

    meshClouds = planet.cloud_mesh;
    scene.add(meshClouds);
}

function setupMarkers() {
    const markerRadius = 80;
    const markerColor = 0xff0000;
    markerGeom = new THREE.SphereGeometry(markerRadius, 25, 25);
    markerMaterial = new THREE.MeshPhongMaterial({
        ambient: 0x000000,
        color: markerColor,
        specular: 0xD13100,
        shininess: 1,
        shading: THREE.SmoothShading
    });
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize, false);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updateScene();
    renderScene();
}

function updateScene() {
    const delta = clock.getDelta();
    meshPlanet.rotation.y += rotationSpeed * rotationSpeed * delta;
    meshClouds.rotation.y += rotationSpeed * 1.25 * rotationSpeed * delta;
    controls.update();
    TWEEN.update();
}

function renderScene() {
    renderer.clear();
    renderer.render(scene, camera);
}

// Data visualization functions
function addData(latFrom, longFrom, latTo, longTo, value, percent) {
    addTrack(latFrom, longFrom, latTo, longTo, PLANET_RADIUS, value, percent);
    addMarker(latFrom, longFrom, PLANET_RADIUS, value);
    addMarker(latTo, longTo, PLANET_RADIUS, value);
}

function addMarker(lat, lng, radius, value) {
    const markerMesh = new THREE.Mesh(markerGeom, markerMaterial);
    const markerPosition = latlngPosFromLatLng(lat, lng, radius);
    markerMesh.position.set(markerPosition.x, markerPosition.y, markerPosition.z);
    markerMesh.name = "trackmarker";
    meshPlanet.add(markerMesh);
}

function addTrack(startLat, startLng, endLat, endLng, radius, value, percent) {
    const numControlPoints = 8;
    const maxAltitude = 500 + (10 * percent);
    const points = createTrackPoints(startLat, startLng, endLat, endLng, radius, numControlPoints, maxAltitude);
    const spline = new THREE.SplineCurve3(points);
    addTrackLine(spline, value, percent);
}

function createTrackPoints(startLat, startLng, endLat, endLng, radius, numPoints, maxAltitude) {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
        const arcAngle = i * 180.0 / numPoints;
        const arcRadius = radius + (Math.sin(latlngDeg2rad(arcAngle))) * maxAltitude;
        const latlng = latlngInterPoint(startLat, startLng, endLat, endLng, i / numPoints);
        const pos = latlngPosFromLatLng(latlng.lat, latlng.lng, arcRadius);
        points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    }
    return points;
}

function addTrackLine(spline, value, percent) {
    const numControlPoints = 30;
    const geometry = new THREE.Geometry();
    const colors = [];

    for (let i = 0; i < numControlPoints; i++) {
        const index = i / numControlPoints;
        const pos = spline.getPoint(index);
        geometry.vertices.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        colors[i] = getColorForValue(value);
    }

    geometry.colors = colors;

    const material = new THREE.LineBasicMaterial({
        linewidth: 1,
        transparent: true,
        opacity: 0.3,
        vertexColors: true
    });

    const line = new THREE.Line(geometry, material);
    line.name = "trackline";
    meshPlanet.add(line);
}

function getColorForValue(value) {
    if (value > 180) return new THREE.Color(0xFF0000);
    if (value > 90) return new THREE.Color(0xFF9B00);
    if (value > 45) return new THREE.Color(0xFFFF00);
    if (value >= 0) return new THREE.Color(0x00FF00);
    return new THREE.Color(0x0000FF);
}

// Main execution
window.onload = function () {
    init();
    loadDataCenters(function (dataCentersResponse) {
        dataCenters = dataCentersResponse;
        loadData(dataCenters, function (data) {
            drawParam('latencies', 'latency', data, 0, 100);
            showVisualization();
        });
    });
};

window.addEventListener('contentLoaded', function () {
    animate();
});

var dataCenters = {};

$.urlParam = function (name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results == null) {
        return null;
    }
    else {
        return results[1] || 0;
    }
};

function loadDataCenters(callback) {
    var result = {};
    $.get('/dataCenter', {
        token: $.urlParam('token')
    }, function (data) {
        if (!data.dataCenters) {
            window.location = '/';
        } else {
            for (var i = 0; i < data.dataCenters.length; i++) {
                result[data.dataCenters[i].dcId] = data.dataCenters[i];
            }
            callback(result);
        }
    });
}

function loadData(dataCenters, callback) {
    $('#dateTitle').html(moment().add(-2,'d').startOf('d').format('MMM DD'));
    var dateFrom = moment().add(-2,'d').startOf('d').format('YYYY-MM-DD');
    var dateTo = moment().add(-1,'d').startOf('d').format('YYYY-MM-DD');
    $.get('/realTimeMap', {
        startTime: dateFrom,
        endTime: dateTo,
        interval: 'DAY',
        token: $.urlParam('token')
    }, function (response) {
        var data = response.data;
        for (var i = 0; i < data.length; i++) {
            for (var x = 0; x < data[i].latencies.length; x++) {
                data[i].latencies[x].from = dataCenters[data[i].latencies[x].from];
                data[i].latencies[x].to = dataCenters[data[i].latencies[x].to];
            }
        }
        callback(data);
    });
}
var loadedItems = {
    planet_normals_texture: false,
    planet_surface_texture: false,
    planet_specular_texture: false
};

function registerLoaded(item) {
    loadedItems[item] = true;
    if (loadedItems.planet_normals_texture &&
        loadedItems.planet_surface_texture &&
        loadedItems.planet_specular_texture) {

        setTimeout(function () {
            var event = new Event('contentLoaded');
            window.dispatchEvent(event);
        }, 500);
    }
};


// get the point in space on surface of sphere radius radius from lat lng
// lat and lng are in degrees
function latlngPosFromLatLng(lat, lng, radius) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (360 - lng) * Math.PI / 180;
    var x = radius * Math.sin(phi) * Math.cos(theta);
    var y = radius * Math.cos(phi);
    var z = radius * Math.sin(phi) * Math.sin(theta);

    return {
        phi: phi,
        theta: theta,
        x: x,
        y: y,
        z: z
    };
}

// convert an angle in degrees to same in radians
function latlngDeg2rad(n) {
    return n * Math.PI / 180;
}

// Find intermediate points on sphere between two lat/lngs
// lat and lng are in degrees
// offset goes from 0 (lat/lng1) to 1 (lat/lng2)
// formula from http://williams.best.vwh.net/avform.htm#Intermediate
function latlngInterPoint(lat1, lng1, lat2, lng2, offset) {
    lat1 = latlngDeg2rad(lat1);
    lng1 = latlngDeg2rad(lng1);
    lat2 = latlngDeg2rad(lat2);
    lng2 = latlngDeg2rad(lng2);

    d = 2 * Math.asin(Math.sqrt(Math.pow((Math.sin((lat1 - lat2) / 2)), 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)));
    A = Math.sin((1 - offset) * d) / Math.sin(d);
    B = Math.sin(offset * d) / Math.sin(d);
    x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    z = A * Math.sin(lat1) + B * Math.sin(lat2);
    lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))) * 180 / Math.PI;
    lng = Math.atan2(y, x) * 180 / Math.PI;

    return {
        lat: lat,
        lng: lng
    };
}


function cpPlanet(params) {

    this.planet_radius = 100;
    if (typeof (params.planet_radius) != "undefined") {
        this.planet_radius = params.planet_radius;
    }

    this.cloud_radius = this.planet_radius * 1.02;
    if (typeof (params.cloud_radius) != "undefined") {
        this.cloud_radius = params.cloud_radius;
    }

    this.cloud_scale = this.cloud_radius / this.planet_radius;

    this.planet_tilt = 0;
    if (typeof (params.planet_tilt) != "undefined") {
        this.planet_tilt = params.planet_tilt;
    }

    this.planet_geom_segments = 50;
    if (typeof (params.planet_geom_segments) != "undefined") {
        this.planet_geom_segments = params.planet_geom_segments;
    }

    this.planet_geom_rings = 50;
    if (typeof (params.planet_geom_rings) != "undefined") {
        this.planet_geom_rings = params.planet_geom_rings;
    }

    this.planet_surface_texture = "";
    if (typeof (params.planet_surface_texture) != "undefined") {
        this.planet_surface_texture = params.planet_surface_texture;
    }

    this.planet_cloud_texture = "";
    if (typeof (params.planet_cloud_texture) != "undefined") {
        this.planet_cloud_texture = params.planet_cloud_texture;
    }

    this.planet_normals_texture = "";
    if (typeof (params.planet_normals_texture) != "undefined") {
        this.planet_normals_texture = params.planet_normals_texture;
    }

    this.planet_specular_texture = "";
    if (typeof (params.planet_specular_texture) != "undefined") {
        this.planet_specular_texture = params.planet_specular_texture;
    }

    this.use_surface_shader = false;
    if (typeof (params.use_surface_shader) != "undefined") {
        this.use_surface_shader = params.use_surface_shader;
    }

    this.create_combined_mesh = false;
    if (typeof (params.create_combined_mesh) != "undefined") {
        this.create_combined_mesh = params.create_combined_mesh;
    }

    this.geometry = new THREE.SphereGeometry(this.planet_radius, this.planet_geom_segments, this.planet_geom_rings);
    this.geometry.computeTangents();

    this.shader = THREE.ShaderUtils.lib.normal;
    this.uniforms = THREE.UniformsUtils.clone(this.shader.uniforms);

    if (this.use_surface_shader === true) {

        this.uniforms.tNormal.value = THREE.ImageUtils.loadTexture(this.planet_normals_texture, null, function () {
            registerLoaded('planet_normals_texture');
        });
        this.uniforms.uNormalScale.value.x = 1.85;
        this.uniforms.uNormalScale.value.y = 1.85;
        this.uniforms.tDiffuse.value = THREE.ImageUtils.loadTexture(this.planet_surface_texture, null, function () {
            registerLoaded('planet_surface_texture');
        });

        this.uniforms.tSpecular.value = THREE.ImageUtils.loadTexture(this.planet_specular_texture, null, function () {
            registerLoaded('planet_specular_texture');
        });
        this.uniforms.enableAO.value = false;
        this.uniforms.enableDiffuse.value = true;
        this.uniforms.enableSpecular.value = true;
        this.uniforms.uDiffuseColor.value.setHex(0xffffff);
        this.uniforms.uSpecularColor.value.setHex(0x999999);
        this.uniforms.uAmbientColor.value.setHex(0xffffff);
        this.uniforms.uShininess.value = 50;
        this.uniforms.uDiffuseColor.value.convertGammaToLinear();
        this.uniforms.uSpecularColor.value.convertGammaToLinear();
        this.uniforms.uAmbientColor.value.convertGammaToLinear();

        this.surface_material = new THREE.ShaderMaterial({
            fragmentShader: this.shader.fragmentShader,
            vertexShader: this.shader.vertexShader,
            uniforms: this.uniforms,
            lights: true
        });

        this.surface_mesh = new THREE.Mesh(this.geometry, this.surface_material);

    } else if (this.planet_surface_texture.length > 0) {
        this.surface_material = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            map: THREE.ImageUtils.loadTexture(this.planet_surface_texture),
            transparent: false
        });
        this.surface_mesh = new THREE.Mesh(this.geometry, this.surface_material);

    } else {
        this.default_materials = [
            new THREE.MeshBasicMaterial({
                color: 0x333399
            }),
            new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                wireframeLinewidth: 2
            })];
        this.surface_mesh = THREE.SceneUtils.createMultiMaterialObject(this.geometry, this.default_materials);
    }

    this.surface_mesh.rotation.z = this.planet_tilt;

    if (this.planet_cloud_texture.length > 0) {
        this.cloud_material = new THREE.MeshLambertMaterial({
            color: 0x6666ff,
            map: THREE.ImageUtils.loadTexture(this.planet_cloud_texture),
            transparent: true
        });
        this.cloud_mesh = new THREE.Mesh(this.geometry, this.cloud_material);
        this.cloud_mesh.scale.set(this.cloud_scale, this.cloud_scale, this.cloud_scale);
        this.cloud_mesh.rotation.z = this.planet_tilt;
    }
    ;

    if (this.create_combined_mesh === true) {
        this.combined_mesh = new THREE.Object3D();
        this.combined_mesh.add(this.surface_mesh);
        this.combined_mesh.add(this.cloud_mesh);
    }

    return {
        surface_mesh: this.surface_mesh,
        cloud_mesh: this.cloud_mesh,
        combined_mesh: this.combined_mesh
    };
}


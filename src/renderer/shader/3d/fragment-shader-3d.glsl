precision highp float;
precision highp sampler3D;

in vec3 vOrigin;
in vec3 vDirection;
out vec4 color;

uniform sampler3D volumeTexture;
uniform float stepSize;
uniform float voxelSizeZ;
uniform float windowCenter;
uniform float windowWidth;
uniform float u_isoValue;
uniform vec3 u_lightDir;
uniform vec3 u_cameraPos;

/* Window / Level */
float voiLut(float value) {
    float wMin = windowCenter - windowWidth * 0.5;
    float wMax = windowCenter + windowWidth * 0.5;
    return clamp((value - wMin) / (wMax - wMin), 0.0, 1.0);
}

/* Hitbox */
vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 box_min = vec3(-0.5);
    vec3 box_max = vec3(0.5);
    box_min.z *= voxelSizeZ;
    box_max.z *= voxelSizeZ;

    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmax_tmp, tmin_tmp);

    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
}

/* Gradienten-Normale */
vec3 computeNormal(vec3 coord) {
    vec3 texSize = vec3(textureSize(volumeTexture,0));
    vec3 eps = 1.0 / texSize;
    
    float dx = voiLut(texture(volumeTexture, coord + vec3(eps.x,0.0,0.0)).r)
             - voiLut(texture(volumeTexture, coord - vec3(eps.x,0.0,0.0)).r);
    float dy = voiLut(texture(volumeTexture, coord + vec3(0.0,eps.y,0.0)).r)
             - voiLut(texture(volumeTexture, coord - vec3(0.0,eps.y,0.0)).r);
    float dz = voiLut(texture(volumeTexture, coord + vec3(0.0,0.0,eps.z)).r)
             - voiLut(texture(volumeTexture, coord - vec3(0.0,0.0,eps.z)).r);

    vec3 normal = normalize(vec3(dx, dy, dz));
    if(length(normal) < 0.001) normal = vec3(0.0,0.0,1.0); // fallback
    return normal;
}

void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);
    if(bounds.x > bounds.y) discard;
    float t = max(bounds.x, 0.0);

    vec3 rayPos = vOrigin + t*rayDir;
    vec3 texSize = vec3(textureSize(volumeTexture,0));
    float delta = stepSize / max(abs(rayDir.x)*texSize.x,
                                 max(abs(rayDir.y)*texSize.y,
                                     abs(rayDir.z)*texSize.z));

    for(int i=0;i<1024;i++){
        vec3 coord = rayPos + 0.5;  // transform to [0,1]
        coord.z /= voxelSizeZ;

        float val = voiLut(texture(volumeTexture, coord).r);
        if(val >= u_isoValue){
            vec3 normal = computeNormal(coord);
            vec3 lightDir = normalize(u_lightDir);
            float diff = max(dot(normal, lightDir), 0.0);

            vec3 viewDir = normalize(u_cameraPos - rayPos);
            vec3 halfVec = normalize(viewDir + lightDir);
            float spec = pow(max(dot(normal, halfVec),0.0),32.0);

            vec3 colorOut = vec3(3.0)*diff + vec3(2.0)*spec; // stärker skalieren
            color = vec4(colorOut,1.0);
            return;
        }

        t += delta;
        rayPos = vOrigin + t*rayDir;
        if(t > bounds.y) break;
    }

    discard;
}

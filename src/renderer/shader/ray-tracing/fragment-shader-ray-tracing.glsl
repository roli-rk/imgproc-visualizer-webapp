precision highp float;
precision highp sampler3D;

in vec3 v_position;
in vec2 v_uv;
out vec4 outColor;

uniform sampler3D volumeTexture;
uniform sampler2D u_transferFunction;
uniform sampler2D u_depthTexture; // Depth aus erstem Pass
uniform float u_near;
uniform float u_far;
uniform int u_steps;
uniform vec3 u_cameraPos;
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat4 u_inverseProjectionMatrix;

float sampleVolume(vec3 pos) {
    return texture(volumeTexture, pos).r;
}

float depthToEyeZ(float depth) {
    // depth ist im Bereich [0,1], convert to NDC z: [-1,1]
    float z_ndc = depth * 2.0 - 1.0;
    // Nun von NDC z nach eye space z:
    return (2.0 * u_near * u_far) / (u_far + u_near - z_ndc * (u_far - u_near));
}

void main() {
    // Hole den Tiefenwert des bereits gerenderten Bildes:
    float sceneDepth = texture(u_depthTexture, v_uv).r;
    float sceneEyeZ = depthToEyeZ(sceneDepth);

    // Bestimmen Sie den Eintritt ins Volumen [0,1]^3
    vec3 entryPoint = (v_position * 0.5) + 0.5;

    vec4 worldPos = u_modelMatrix * vec4(v_position, 1.0);
    vec3 rayDir = normalize(worldPos.xyz - u_cameraPos);

    // Schneide mit [0,1]^3
    vec3 invDir = 1.0 / rayDir;
    vec3 t0 = (vec3(0.0) - entryPoint)*invDir;
    vec3 t1 = (vec3(1.0) - entryPoint)*invDir;
    vec3 tmin = min(t0,t1);
    vec3 tmax = max(t0,t1);
    float tEntry = 0.0;
    float tExit = min(min(tmax.x,tmax.y), tmax.z);
    float lengthInside = tExit - tEntry;
    float dt = lengthInside / float(u_steps);

    vec4 accumulatedColor = vec4(0.0);
    float t = tEntry;

    // Um die Position des Samples in Kamerakoordinaten zu bestimmen,
    // transformieren wir von Welt nach Kamera (View) Raum.
    // (u_viewMatrix * vec4(worldPos,1.0)) -> Kamera Raum
    mat4 viewMat = u_viewMatrix;

    for (int i = 0; i < 1000; i++) {
        if (i >= u_steps) break;

        vec3 samplePos = entryPoint + rayDir * t;
        
        // Weltkoordinaten der aktuellen Sample-Position:
        vec4 sampleWorldPos = u_modelMatrix * vec4(samplePos*1.0,1.0);
        vec4 sampleViewPos = viewMat * sampleWorldPos; // Nun in Kamera-Raum
        float sampleZ = -sampleViewPos.z; // In OpenGL ist vor der Kamera negativer z, wir nehmen den negativen Wert um Distanz vor der Kamera zu haben

        // Vergleiche mit sceneEyeZ
        // Wenn sampleZ größer als sceneEyeZ ist, bedeutet es, dass dieses Sample weiter von der Kamera entfernt ist als das bereits gerenderte Objekt
        // Also ist dieses Sample blockiert.
        if (sampleZ > sceneEyeZ) {
            // Hinter einem Objekt, abbrechen.
            break;
        }

        float intensity = sampleVolume(samplePos);
        vec4 tfColor = texture(u_transferFunction, vec2(intensity, 0.5));

        if (tfColor.a > 0.0) {
            accumulatedColor.rgb += (1.0 - accumulatedColor.a) * tfColor.rgb * tfColor.a;
            accumulatedColor.a += (1.0 - accumulatedColor.a) * tfColor.a;
            if (accumulatedColor.a > 0.99) {
                break;
            }
        }
        
        t += dt;
        if (t > tExit) {
            break;
        }
    }

    outColor = accumulatedColor;
}

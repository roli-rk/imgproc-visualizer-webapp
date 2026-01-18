precision highp float;
precision highp sampler3D;

out vec3 v_position;
out vec2 v_uv;

void main() {
    v_position = position; // position ist bereits definiert
    vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = clipPos;
    
    v_uv = (clipPos.xy / clipPos.w) * 0.5 + 0.5;
}
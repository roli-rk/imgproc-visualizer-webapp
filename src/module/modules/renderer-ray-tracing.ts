import * as THREE from 'three';
import { Module } from '../module';
import { ToHalfFloat } from '../../utils/to-half-float';
import volumeVertexShader from '../../renderer/shader/ray-tracing/vertex-shader-ray-tracing.glsl';
import volumeFragmentShader from '../../renderer/shader/ray-tracing/fragment-shader-ray-tracing.glsl';
import image from '../../assets/transferFunction.png';

export default class RendererRayTracing extends Module {
    private renderer: THREE.WebGLRenderer | undefined;
    private scene: THREE.Scene | undefined; // Szene für das Volumen
    private sceneOpaque: THREE.Scene; // Opake Szene (erster Pass)
    private camera: THREE.PerspectiveCamera | undefined;
    private material: THREE.ShaderMaterial | undefined;
    private volumeTexture: THREE.Data3DTexture | undefined;
    private transferFunctionTexture: THREE.Texture | undefined;
    private canvas: HTMLCanvasElement | undefined;
    private htmlInfo: HTMLElement | undefined;
    private mesh: THREE.Mesh | undefined;
    private isCanvasActive: boolean = false;

    private depthTexture: THREE.DepthTexture | undefined;
    private rt: THREE.WebGLRenderTarget | undefined;

    constructor() {
        super(
            { 0: 1, 1: 0, 2: 0 },
            { 0: 0, 1: 0, 2: 0 },
            'raytracing',
            'RayTracing Module'
        );
        this.sceneOpaque = new THREE.Scene();
        // Beispielhaft fügen wir einen Würfel als opakes Objekt hinzu:
        const cubeGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const cubeMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const cubeMesh = new THREE.Mesh(cubeGeom, cubeMat);
        cubeMesh.position.set(0, 0, 0);
        this.sceneOpaque.add(cubeMesh);
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1);
        this.sceneOpaque.add(light);

        this.setInnerModule();
    }

    protected setInnerModule(): void {
        this.innerModule!.innerHTML = `<p>RayTracing Module</p>`;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'renderCanvas';
        this.canvas.width = 512;
        this.canvas.height = 512;
        this.innerModule!.appendChild(this.canvas);

        this.htmlInfo = document.createElement('div');
        this.htmlInfo.id = 'infoRendering';
        this.innerModule!.appendChild(this.htmlInfo);

        // Doppelklick, um Canvas zu aktivieren/deaktivieren
        this.html?.addEventListener('dblclick', () => {
            if (this.canvas) {
                document.body.appendChild(this.canvas);
                if (
                    this.isCanvasActive &&
                    document.getElementById('renderCanvas') === this.canvas
                ) {
                    // Canvas entfernen, falls gewünscht
                } else {
                    document.body.appendChild(this.canvas);
                    this.canvas.height = this.canvas.clientHeight;
                    this.canvas.width = this.canvas.clientWidth;
                    this.renderer?.setSize(
                        this.canvas.width,
                        this.canvas.height
                    );

                    // Aktives Renderer-Modul kennzeichnen
                    this.html?.setAttribute('id', 'activeRenderer');

                    // Info hinzufügen wenn Daten vorhanden
                    if (this.htmlInfo && this.imageDataInputs?.[0].data) {
                        document.body.appendChild(this.htmlInfo);
                    }
                    this.isCanvasActive = true;
                }
            }
        });
    }

    connectedCallback() {
        super.connectedCallback();
        this.initThree();
        this.animate1();
    }

    private initThree() {
        if (!this.canvas) return;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.canvas.width / this.canvas.height,
            0.1,
            100
        );
        this.camera.position.z = 3;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);

        // Depth-Textur erstellen
        this.depthTexture = new THREE.DepthTexture(
            window.innerWidth,
            window.innerHeight
        );
        this.depthTexture.type = THREE.UnsignedShortType;
        this.depthTexture.format = THREE.DepthFormat;

        this.rt = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                depthTexture: this.depthTexture,
                depthBuffer: true,
            }
        );

        // Transferfunktion laden (2D Texture)
        this.transferFunctionTexture = new THREE.TextureLoader().load(image);
        this.transferFunctionTexture.minFilter = THREE.LinearFilter;
        this.transferFunctionTexture.magFilter = THREE.LinearFilter;
    }

    private animate1() {
        requestAnimationFrame(() => this.animate1());
        if (!this.renderer || !this.camera || !this.scene) return;

        // Erster Pass: Opaque Szene in RenderTarget mit Depth
        if (this.rt) {
            this.renderer.setRenderTarget(this.rt);
            this.renderer.clear();
            this.renderer.render(this.sceneOpaque, this.camera);
            this.renderer.setRenderTarget(null);
        }
        if (this.mesh) {
            this.mesh.rotation.y += 0.01;
        }

        // Nur rendern, wenn Canvas aktiv ist
        if (this.isCanvasActive) {
            // Uniforms für Kamera bei Bewegung updaten
            if (this.material && this.material.uniforms) {
                this.material.uniforms.u_viewMatrix.value.copy(
                    this.camera.matrixWorldInverse
                );
                this.material.uniforms.u_cameraPos.value.copy(
                    this.camera.position
                );
                this.material.uniforms.u_inverseProjectionMatrix.value
                    .copy(this.camera.projectionMatrix)
                    .invert();
            }

            // Zweiter Pass: Volumen
            this.renderer.render(this.scene, this.camera);
        }
    }

    protected async onUpdateImageDataInput(): Promise<void> {
        this.createTexture();
        this.createMaterial();
        this.createMesh();
        if (this.mesh && this.scene) {
            this.scene.add(this.mesh);
        }
        this.notifyOutputs();
    }

    protected async onUpdateSceneInput(): Promise<void> {
        this.notifyOutputs();
    }

    protected async onUpdateBaseObjectInput(): Promise<void> {
        this.notifyOutputs();
    }

    protected onDialogSubmitCallback(value: any): void {
        // Falls nötig
    }

    protected releaseInChild(): void {
        this.renderer?.dispose();
        this.material?.dispose();
        delete this.renderer;
        delete this.scene;
        delete this.camera;
        delete this.material;
        delete this.volumeTexture;
        delete this.mesh;
        delete this.canvas;
        delete this.htmlInfo;
        delete this.depthTexture;
        delete this.rt;
        delete this.transferFunctionTexture;
    }

    protected createTexture(): void {
        if (!this.imageDataInputs?.[0]?.data) {
            this.volumeTexture = new THREE.Data3DTexture(
                new Uint8Array(),
                0,
                0,
                0
            );
            return;
        }

        const { data, width, height, depth } = this.imageDataInputs[0].data;
        if (!data) {
            this.volumeTexture = new THREE.Data3DTexture(
                new Uint8Array(),
                0,
                0,
                0
            );
            return;
        }

        if (data instanceof Uint8Array) {
            this.volumeTexture = new THREE.Data3DTexture(
                data,
                width,
                height,
                depth
            );
            this.volumeTexture.type = THREE.UnsignedByteType;
        } else if (data instanceof Uint16Array) {
            const halfData = new Uint16Array(data.length);
            for (let i = 0; i < data.length; i++) {
                halfData[i] = ToHalfFloat(data[i]);
            }
            this.volumeTexture = new THREE.Data3DTexture(
                halfData,
                width,
                height,
                depth
            );
            this.volumeTexture.type = THREE.HalfFloatType;
        } else {
            this.volumeTexture = new THREE.Data3DTexture(
                new Uint8Array(),
                0,
                0,
                0
            );
        }

        this.volumeTexture.format = THREE.RedFormat;
        this.volumeTexture.minFilter = THREE.LinearFilter;
        this.volumeTexture.magFilter = THREE.LinearFilter;
        this.volumeTexture.unpackAlignment = 1;
        this.volumeTexture.needsUpdate = true;
    }

    private createMaterial() {
        if (
            !this.volumeTexture ||
            !this.camera ||
            !this.transferFunctionTexture ||
            !this.depthTexture
        )
            return;

        this.material = new THREE.ShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: `
                precision highp float;
                out vec3 v_position;
                out vec2 v_uv;
                void main() {
                    v_position = position;
                    vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    gl_Position = clipPos;
                    v_uv = (clipPos.xy / clipPos.w)*0.5 + 0.5;
                }
            `,
            fragmentShader: `
                precision highp float;
                precision highp sampler3D;

                in vec3 v_position;
                in vec2 v_uv;
                out vec4 outColor;

                uniform sampler3D volumeTexture;
                uniform sampler2D u_transferFunction;
                uniform sampler2D u_depthTexture;
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
                    float z_ndc = depth*2.0 - 1.0;
                    return (2.0 * u_near * u_far) / (u_far + u_near - z_ndc * (u_far - u_near));
                }

                void main() {
                    float sceneDepth = texture(u_depthTexture, v_uv).r;
                    float sceneEyeZ = depthToEyeZ(sceneDepth);

                    vec3 entryPoint = (v_position*0.5)+0.5;
                    vec4 worldPos = u_modelMatrix * vec4(v_position,1.0);
                    vec3 rayDir = normalize(worldPos.xyz - u_cameraPos);

                    vec3 invDir = 1.0 / rayDir;
                    vec3 t0 = (vec3(0.0)-entryPoint)*invDir;
                    vec3 t1 = (vec3(1.0)-entryPoint)*invDir;
                    vec3 tmin = min(t0,t1);
                    vec3 tmax = max(t0,t1);
                    float tEntry = 0.0;
                    float tExit = min(min(tmax.x,tmax.y), tmax.z);
                    float lengthInside = tExit - tEntry;
                    float dt = lengthInside/float(u_steps);

                    vec4 accumulatedColor = vec4(0.0);
                    float t = tEntry;

                    mat4 viewMat = u_viewMatrix;

                    for (int i=0; i<1000; i++) {
                        if (i>=u_steps) break;
                        vec3 samplePos = entryPoint + rayDir*t;
                        vec4 sampleWorldPos = u_modelMatrix * vec4(samplePos,1.0);
                        vec4 sampleViewPos = viewMat * sampleWorldPos;
                        float sampleZ = -sampleViewPos.z;

                        if (sampleZ>sceneEyeZ) {
                            break;
                        }

                        float intensity = sampleVolume(samplePos);
                        vec4 tfColor = texture(u_transferFunction, vec2(intensity,0.5));
                        if (tfColor.a>0.4) {
                            accumulatedColor.rgb += (1.0-accumulatedColor.a)*tfColor.rgb*tfColor.a;
                            accumulatedColor.a += (1.0-accumulatedColor.a)*tfColor.a;
                            if (accumulatedColor.a>0.99) {
                                break;
                            }
                        }

                        t+=dt;
                        if (t>tExit) {
                            break;
                        }
                    }
                    outColor = accumulatedColor;
                }
            `,
            uniforms: {
                volumeTexture: { value: this.volumeTexture },
                u_transferFunction: { value: this.transferFunctionTexture },
                u_depthTexture: { value: this.depthTexture },
                u_steps: { value: 256 },
                u_near: { value: this.camera.near },
                u_far: { value: this.camera.far },
                u_cameraPos: { value: this.camera.position.clone() },
                u_viewMatrix: { value: this.camera.matrixWorldInverse.clone() },
                u_projectionMatrix: {
                    value: this.camera.projectionMatrix.clone(),
                },
                u_inverseProjectionMatrix: {
                    value: new THREE.Matrix4()
                        .copy(this.camera.projectionMatrix)
                        .invert(),
                },
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
    }

    private createMesh() {
        if (!this.material) return;
        const volumeBoxGeom = new THREE.BoxGeometry(1, 1, 1);
        this.mesh = new THREE.Mesh(volumeBoxGeom, this.material);
        this.mesh.position.set(0, 0, -1);
    }
}

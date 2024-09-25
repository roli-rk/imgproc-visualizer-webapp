class GlobalState {
    private static instance: GlobalState;
    private clicked: boolean = false;

    private constructor() {}

    public static getInstance(): GlobalState {
        if (!GlobalState.instance) {
            GlobalState.instance = new GlobalState();
        }
        return GlobalState.instance;
    }
    public getState(): boolean {
        return this.clicked;
    }
    public setState(_clicked: boolean) {
        this.clicked = _clicked;
    }
}

export default GlobalState.getInstance();

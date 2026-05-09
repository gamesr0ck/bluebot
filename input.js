export class InputManager {
    constructor() {
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false,
            z: false,
            x: false,
            c: false
        };
        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key) || this.keys.hasOwnProperty(e.key.toLowerCase())) {
                const key = e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'c' ? e.key.toLowerCase() : e.key;
                if(this.keys.hasOwnProperty(key)) this.keys[key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key) || this.keys.hasOwnProperty(e.key.toLowerCase())) {
                const key = e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'c' ? e.key.toLowerCase() : e.key;
                if(this.keys.hasOwnProperty(key)) this.keys[key] = false;
            }
        });

        // Mobile Controls
        const controlBtns = document.querySelectorAll('.control-btn');
        controlBtns.forEach(btn => {
            const key = btn.getAttribute('data-key');
            
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys[key] = true;
                btn.classList.add('active');
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[key] = false;
                btn.classList.remove('active');
            });
            
            btn.addEventListener('mousedown', (e) => {
                this.keys[key] = true;
                btn.classList.add('active');
            });
            btn.addEventListener('mouseup', (e) => {
                this.keys[key] = false;
                btn.classList.remove('active');
            });
            btn.addEventListener('mouseleave', (e) => {
                this.keys[key] = false;
                btn.classList.remove('active');
            });
        });
    }

    getKeys() {
        return this.keys;
    }
}

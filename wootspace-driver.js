// @ts-check
let deviceFilter = { vendorId: 0x03eb, productId: 0xff01, usagePage: 0xFF54 };
const requestParams = { filters: [deviceFilter] };

// WootSpaceDriver
// Tested with Wooting One on Linux
//
// Reads keys and dispatches x, y, z, rx, ry, rz and buttons
//

export const WootSpaceDriver = new class extends EventTarget {
    #device // Just allow one device, for now
    #keys

    constructor() {
        super();

        this.#keys = {};

        this.handleInputReport = this.handleInputReport.bind(this);

        const tryConnect = (device) => {
            // WootingOne seems to expose 6 devices (USB interfaces)
            // The one that sends analog data seems to be on Index 3 with usagePage 0xFF54
            // TODO: check if this is the most elegant way to find the right one.
            if (device.collections[0]?.usagePage === deviceFilter.usagePage) {
                this.openDevice(device);
            }
        }

        // See if a paired device is already connected
        navigator.hid.getDevices().then((devices) => {
            const filterWooting = devices.filter(d => d.vendorId === deviceFilter.vendorId);
            filterWooting.forEach(device => tryConnect(device));
        });

        navigator.hid.addEventListener('connect', evt => tryConnect(evt.device));

        navigator.hid.addEventListener('disconnect', evt => {
            const device = evt.device;
            if (device === this.#device) {
                console.log('disconnected', device);
                this.disconnect();
            }
        });
    }

    openDevice(device) {
        device.open().then(() => {
            this.disconnect(); // If another device is connected - close it

            console.log('Opened device: ', device);
            device.addEventListener('inputreport', this.handleInputReport);
            this.#device = device;
            this.dispatchEvent(new CustomEvent('connect', {detail: { device }}));
        });
    }

    disconnect() {
        this.#device?.close();
        this.#device = undefined;
        this.dispatchEvent(new Event('disconnect'));
    }

    scan() {
        navigator.hid.requestDevice(requestParams).then(devices => {
            if (devices.length == 0) return;
            this.openDevice(devices[0]);
        });
    }

    handleInputReport(e) {
        // 48 bytes are sent - but only the first 3 seems to be needed (check with Wooting)
        const read = (new Uint8Array(e.data.buffer)).slice(0, 3);

        if (read.every(v => v === 0)) {
            this.#keys = {};
        } else {
            this.#keys[read[1]] = read[2];
        }

        this.handleKeys();
    }

    handleKeys() {
        //     4 -> -x (KEY A)
        //     7 -> +x (KEY D)
        //    26 -> -y (KEY W)
        //    27 -> +y (KEY X)
        //     8 -> -z (KEY E)
        //    29 -> +z (KEY Z)

        this.dispatchEvent(new CustomEvent('translate', {
            detail: {
                x: (this.#keys[7] || 0) - (this.#keys[4] || 0),
                y: (this.#keys[27] || 0) - (this.#keys[26] || 0),
                z: (this.#keys[29] || 0) - (this.#keys[8] || 0),
            }
        }));

        //    11 -> -rx (KEY H)
        //    14 -> +rx (KEY K)
        //    24 -> -ry (KEY U)
        //    16 -> +ry (KEY M)
        //    12 -> -rz (KEY I)
        //    17 -> +rz (KEY N)

        // TODO: Change mapping to something more intuitive.

        this.dispatchEvent(new CustomEvent('rotate', {
            detail: {
                rx: (this.#keys[14] || 0) - (this.#keys[11] || 0),
                ry: (this.#keys[16] || 0) - (this.#keys[24] || 0),
                rz: (this.#keys[17] || 0) - (this.#keys[12] || 0),
            }
        }));

        const buttons = [];

        for(const [key, value] of Object.entries(this.#keys)) {
            buttons.push(`[${key} -> ${value}]`);
        }

        this.dispatchEvent(new CustomEvent('buttons', {
            detail: { buttons }
        }));

    }
}

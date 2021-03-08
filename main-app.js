// @ts-check
import { Demo3DObj } from './demo-3dobj.js';
import { WootSpaceDriver } from './wootspace-driver.js';

export class MainApp extends HTMLElement {
    /** @type {Demo3DObj} */ #obj
    #cells

    constructor() {
        super();

        this.#cells = [];

        this.handleTranslate = this.handleTranslate.bind(this);
        this.handleRotate = this.handleRotate.bind(this);
        this.handleButtons = this.handleButtons.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    connectedCallback() {
        this.innerHTML = `
        <style>
        #list {
            display: grid;
            grid-template-columns: 1fr 3fr;
            width: 600px;
        }

        </style>

        <button id='connect'>CONNECT</button>
        <h2>Status: <span id='status'> - </span></h2>
        <div id='list'></div>
        <demo-3dobj></demo-3dobj>
        `;


        this.#obj = this.querySelector('demo-3dobj');
        this.querySelector('#connect').addEventListener('click', this.doScan);

        this._initList();

        WootSpaceDriver.addEventListener('translate', this.handleTranslate);
        WootSpaceDriver.addEventListener('rotate', this.handleRotate);
        WootSpaceDriver.addEventListener('buttons', this.handleButtons);
        WootSpaceDriver.addEventListener('connect', this.handleConnect);
        WootSpaceDriver.addEventListener('disconnect', this.handleDisconnect);
    }

    disconnectedCallback() {
        WootSpaceDriver.removeEventListener('translate', this.handleTranslate);
        WootSpaceDriver.removeEventListener('rotate', this.handleRotate);
        WootSpaceDriver.removeEventListener('buttons', this.handleButtons);
        WootSpaceDriver.removeEventListener('connect', this.handleConnect);
        WootSpaceDriver.removeEventListener('disconnect', this.handleDisconnect);
    }

    _initList() {
        const list = this.querySelector('#list');
        const labels = ['X [A & D]', 'Y [W & X]', 'Z [E & Z]', 'Pitch [H & K]', 'Roll [U & M]', 'Yaw [I & N]', 'Buttons'];

        labels.forEach(l => {
            const label = document.createElement('span');
            label.classList.add('label');
            label.innerText = l;

            const value = document.createElement('span');
            value.classList.add('value');
            value.innerText = `-`;
            this.#cells.push(value);

            list.append(label, value);
        });
    }

    setStatus(str) {
        this.querySelector('#status').innerHTML = str;
    }

    setCellValue(i, val) {
        this.#cells[i].innerText = val;
    }

    doScan() {
        WootSpaceDriver.scan();
    }

    handleTranslate(/** @type {CustomEvent} */ evt) {
        const {x, y, z} = evt.detail;
        this.#obj.setTranslation(x, y, -z);
        this.setCellValue(0, x);
        this.setCellValue(1, y);
        this.setCellValue(2, z);
    }

    handleRotate(/** @type {CustomEvent} */ evt) {
        const {rx, ry, rz} = evt.detail;
        this.#obj.setRotation(rx/5, ry/5, rz/5);
        this.setCellValue(3, rx);
        this.setCellValue(4, ry);
        this.setCellValue(5, rz);
    }

    handleButtons(/** @type {CustomEvent} */ evt) {
        const {buttons} = evt.detail;
        this.setCellValue(6, buttons.join(', '));
    }

    handleConnect(/** @type {CustomEvent} */ evt) {
        const {device} = evt.detail;
        this.setStatus(`${device.productName} connected`);
    }

    handleDisconnect() {
        this.setStatus(` - `);
    }
}
customElements.define('main-app', MainApp);

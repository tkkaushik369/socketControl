import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'

export class PlayerCaller {
    userName: string
    callDir: { [id: string]: any }
    playerGui: GUI
    flag: boolean


    constructor(userName: string, playerGui: GUI) {
        this.userName = userName
        this.callDir = {}
        this.playerGui = playerGui
        this.flag = true
    }
}
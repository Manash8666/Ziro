export class CashDrawerController {
  /**
   * Generates ESC/POS pulse command (ESC p m t1 t2) to kick open connected 24V cash drawer.
   * Pin 2 uses m=0x00, Pin 5 uses m=0x01.
   */
  static getKickCommand(pin: 2 | 5 = 2): Uint8Array {
    const m = pin === 5 ? 0x01 : 0x00;
    return new Uint8Array([0x1b, 0x70, m, 0x19, 0xfa]);
  }
}

import { useEffect, useState } from 'react';
import Speaker from '@tools/speaker';

export type UndoCallback = () => Promise<RedoCallback>;
export type RedoCallback = () => Promise<UndoCallback>;

type UndoEdit = [name: string, undoCallback: RedoCallback];
type RedoEdit = [name: string, redoCallback: UndoCallback];

export default abstract class EditManager {
  private static editHistory: UndoEdit[] = [];
  private static redoProphecy: RedoEdit[] = [];
  private static editHints: [string, string] = ['', ''];
  private static working = false;

  static speaker = new Speaker(() => this.getHints());

  static getHints = (): [string, string] => [...this.editHints];

  static requestUndo: () => void = async () => {
    if (this.working) return;
    this.working = true;

    const action = this.editHistory.pop();
    if (!action) return (this.working = false);

    this.redoProphecy.push([action[0], await action[1]()]);
    this.editHints = [
      this.editHistory.length > 0 ? this.editHistory[this.editHistory.length - 1][0] : '',
      action[0]
    ];
    this.speaker.updateListeners();

    this.working = false;
  };

  static requestRedo: () => void = async () => {
    if (this.working) return;
    this.working = true;

    const action = this.redoProphecy.pop();
    if (!action) return (this.working = false);

    this.editHistory.push([action[0], await action[1]()]);
    this.editHints = [
      action[0],
      this.redoProphecy.length > 0 ? this.redoProphecy[this.redoProphecy.length - 1][0] : ''
    ];
    this.speaker.updateListeners();

    this.working = false;
  };

  static addEdit = (name: string, undoCallback: UndoCallback) => {
    this.editHistory.push([name, undoCallback]);

    if (this.editHistory.length > 50) this.editHistory.shift();

    this.redoProphecy = [];
    this.editHints = [name, ''];
    this.speaker.updateListeners();
  };

  static clear = () => {
    this.editHistory = [];
    this.redoProphecy = [];
    this.editHints = ['', ''];
    this.speaker.updateListeners();
  };
}

export function useEditHints() {
  const [hints, setHints] = useState(EditManager.getHints());

  useEffect(() => {
    EditManager.speaker.registerListener(setHints);
    return () => EditManager.speaker.unregisterListener(setHints);
  }, [hints]);

  return hints;
}

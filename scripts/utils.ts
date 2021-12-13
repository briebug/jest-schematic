import { ExecOptions, exec as shellExec } from 'shelljs';

export const exec = async (command: string, options: ExecOptions = {}) =>
  new Promise<void>((resolve, reject) => {
    shellExec(command, options, (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command}\n exited with code: ${code}`));
      }
    });
  });

import { gameRepository } from "@main/repository";

import { registerEvent } from "../register-event";

import type { GameShop } from "@types";
import { getFileBase64 } from "@main/helpers";

import { steamGamesWorker } from "@main/workers";
import { createGame } from "@main/services/library-sync";
import { steamUrlBuilder } from "@shared";

const addGameToLibrary = async (
  _event: Electron.IpcMainInvokeEvent,
  objectID: string,
  title: string,
  shop: GameShop
) => {
  return gameRepository
    .update(
      {
        objectID,
      },
      {
        shop,
        status: null,
        isDeleted: false,
      }
    )
    .then(async ({ affected }) => {
      if (!affected) {
        const steamGame = await steamGamesWorker.run(Number(objectID), {
          name: "getById",
        });

        const iconUrl = steamGame?.clientIcon
          ? steamUrlBuilder.icon(objectID, steamGame.clientIcon)
          : null;

        await gameRepository
          .insert({
            title,
            iconUrl,
            objectID,
            shop,
          })
          .then(() => {
            if (iconUrl) {
              getFileBase64(iconUrl).then((base64) =>
                gameRepository.update({ objectID }, { iconUrl: base64 })
              );
            }
          });
      }

      const game = await gameRepository.findOne({ where: { objectID } });

      createGame(game!);
    });
};

registerEvent("addGameToLibrary", addGameToLibrary);

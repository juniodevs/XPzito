export interface AudioLibrary {
  transitions: {
    in: string;
    out: string;
  };
  random: string[];
}

export interface BotSprite {
  name: string;
  url: string;
}

export interface BotLibrary {
  sprites: BotSprite[];
}

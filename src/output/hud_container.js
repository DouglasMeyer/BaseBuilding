"use strict";
var setTileEditType = require('../actions').setTileEditType,
    Button = require('./button');

class HudContainer extends PIXI.Container {
  static get textures(){
    return [
      Button.textures.default,
      Button.textures.hover,
      Button.textures.active
    ];
  }

  constructor(){
    super();
    window.button = this.buldozeButton = new Button('Buldoze', setTileEditType.bind(null, 'empty'), 150, 40);
    this.addChild(this.buldozeButton);
    this.buildFloorButton = new Button('Build Floor', setTileEditType.bind(null, 'floor'), 150, 40);
    this.addChild(this.buildFloorButton);
  }

  render(gameState){
    this.renderHud(gameState.windowSize, gameState.tileEditType);
  }

  renderHud(windowSize, tileEditType){
    this.buldozeButton.position.x = 5;
    this.buldozeButton.position.y = windowSize.height - 40 - 5;
    this.buldozeButton.forceHover = tileEditType === 'empty';
    this.buldozeButton.updateSprite();

    this.buildFloorButton.position.x = 5;
    this.buildFloorButton.position.y = this.buldozeButton.position.y - 40 - 5;
    this.buildFloorButton.forceHover = tileEditType === 'floor';
    this.buildFloorButton.updateSprite();
  }
}
HudContainer.prototype.renderHud = memoize(HudContainer.prototype.renderHud);

module.exports = HudContainer;

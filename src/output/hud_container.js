"use strict";
var setTileEditType = require('../actions').setTileEditType;

class HudContainer extends PIXI.Container {
  static get textures(){
    return [
      ButtonGraphic.textures.default,
      ButtonGraphic.textures.hover,
      ButtonGraphic.textures.active
    ];
  }

  constructor(){
    super();
    window.button = this.buldozeButton = new ButtonGraphic('Buldoze', setTileEditType.bind(null, 'empty'), 200, 40);
    this.addChild(this.buldozeButton);
    this.buildFloorButton = new ButtonGraphic('Build Floor', setTileEditType.bind(null, 'floor'), 200, 40);
    this.addChild(this.buildFloorButton);
  }

  render(gameState){
    this.renderHud(gameState.windowSize, gameState.tileEditType);
  }

  renderHud(windowSize, tileEditType){
    this.buldozeButton.position.x = 0;
    this.buldozeButton.position.y = windowSize.height - this.buldozeButton.height;
    this.buldozeButton.forceHover = tileEditType === 'empty';
    this.buldozeButton.updateSprite();

    this.buildFloorButton.position.x = 0;
    this.buildFloorButton.position.y = this.buldozeButton.position.y - this.buildFloorButton.height;
    this.buildFloorButton.forceHover = tileEditType === 'floor';
    this.buildFloorButton.updateSprite();
  }
}
HudContainer.prototype.renderHud = memoize(HudContainer.prototype.renderHud);

class ButtonGraphic extends PIXI.Container {
  static get textures(){
    if (this._textures) return this._textures;
    this._textures = {
      default: PIXI.Texture.fromImage('resources/blue_button06.png'),
      hover:   PIXI.Texture.fromImage('resources/blue_button09.png'),
      active:  PIXI.Texture.fromImage('resources/blue_button10.png')
    }
    return this._textures;
  }

  constructor(text, action, width, height){
    super();
    this.action = action;
    this.state = 'default';
    this.sprite = new PIXI.Sprite(ButtonGraphic.textures[this.state]);
    this.addChild( this.sprite );
    this.text = new PIXI.Text(text);
    this.addChild( this.text );
    this.width  = this.sprite.width  = width;
    this.height = this.sprite.height = height;
    this.text.anchor = { x: 0.5, y: 0.5 };
    this.text.position.x = width / 2;
    this.text.position.y = height / 2;

    this.interactive = true;
    this.mouseover = this.onOver;
    this.mouseout = this.onOut;
    this.mousedown = this.onDown;
    this.mouseup = this.onUp;
  }

  updateSprite(){
    var state = this.forceHover ? 'hover' : this.state;
    this.sprite.texture = ButtonGraphic.textures[state];
  }

  onOver(e){
    this.state = 'hover';
    this.updateSprite();
  }
  onOut(e){
    this.state = 'default';
    this.updateSprite();
  }
  onDown(e){
    this.state = 'active';
    this.action();
    this.updateSprite();
  }
  onUp(e){
    this.state = 'hover';
    this.updateSprite();
  }
}

module.exports = HudContainer;

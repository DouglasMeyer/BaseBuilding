"use strict";
var NinePatch = require('./nine_patch'),
    forceReRender = require('../actions').forceReRender;

module.exports = class Button extends PIXI.Container {
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
    this.bg = new NinePatch(Button.textures['default'], 6, 6, 8, 6);
    this.addChild( this.bg );
    this.text = new PIXI.Text(text, {font : '18px Arial'});
    this.addChild( this.text );
    this.bg.width  = width;
    this.bg.height = height;
    this.text.anchor = { x: 0.5, y: 0.6 };
    this.text.position.x = width / 2;
    this.text.position.y = height / 2;

    this.interactive = true;
    this.mouseover = this.onOver;
    this.mouseout = this.onOut;
    this.mousedown = this.onDown;
    this.mouseup = this.onUp;
  }

  updateSprite(){
    var state = this.isDown ? 'active' : ((this.forceHover || this.isOver) ? 'hover' : 'default');
    if (this.bg.texture === Button.textures[state]) return;
    this.bg.texture = Button.textures[state];
    forceReRender();
  }

  onOver(e){
    this.isOver = true;
    this.updateSprite();
  }
  onOut(e){
    this.isOver = false;
    this.isDown = false;
    this.updateSprite();
  }
  onDown(e){
    this.isDown = true;
    this.action();
    this.updateSprite();
  }
  onUp(e){
    this.isDown = false;
    this.updateSprite();
  }
}

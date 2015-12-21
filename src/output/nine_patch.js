"use strict";

function createPatch(texture, x, y, width, height){
  var boarderSprite = new PIXI.Sprite(new PIXI.Texture(texture,
    new PIXI.Rectangle(x, y, width, height)
  ));
  boarderSprite.position.x = x;
  boarderSprite.position.y = y;
  this.addChild( boarderSprite );
  return boarderSprite;
}

function positionPatch(){
  if (!this.top) return;

  this.top.scale.x = this.center.scale.x = this.bottom.scale.x = 1;
  this.top.width = this.center.width = this.bottom.width = this._width - this.borderSizes.left - this.borderSizes.right;
  this.topRight.position.x = this.right.position.x = this.bottomRight.position.x = this._width - this.borderSizes.right;

  this.left.scale.y = this.center.scale.y = this.right.scale.y = 1;
  this.left.height = this.center.height = this.right.height = this._height - this.borderSizes.top - this.borderSizes.bottom;
  this.center.width = this._width - this.borderSizes.left - this.borderSizes.right;

  this.bottomLeft.position.y = this.bottom.position.y = this.bottomRight.position.y = this._height - this.borderSizes.bottom;
}

module.exports = class NinePatch extends PIXI.Container {
  constructor(texture, top, right, bottom, left){
    super();
    this.borderSizes = {
      top: top,
      right: right,
      bottom: bottom,
      left: left
    };
    this.texture = texture;
  }

  updateTexture(texture){
    if (!this._width) this._width = texture.width;
    if (!this._height) this._height = texture.height;

    var innerWidth = texture.width - this.borderSizes.left - this.borderSizes.right,
        innerHeight = texture.height - this.borderSizes.top - this.borderSizes.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) return;

    this.topLeft = createPatch.call(this, texture,
      0,0, this.borderSizes.left, this.borderSizes.top);
    this.top = createPatch.call(this, texture,
      this.borderSizes.left, 0, innerWidth, this.borderSizes.top);
    this.topRight = createPatch.call(this, texture,
      texture.width-this.borderSizes.right, 0, this.borderSizes.right, this.borderSizes.top);

    this.left = createPatch.call(this, texture,
      0, this.borderSizes.top, this.borderSizes.left, innerHeight);
    this.center = createPatch.call(this, texture,
      this.borderSizes.left, this.borderSizes.top, innerWidth, innerHeight);
    this.right = createPatch.call(this, texture,
      texture.width-this.borderSizes.right, this.borderSizes.top, this.borderSizes.right, innerHeight);

    this.bottomLeft = createPatch.call(this, texture,
      0, texture.height-this.borderSizes.bottom, this.borderSizes.left, this.borderSizes.bottom);
    this.bottom = createPatch.call(this, texture,
      this.borderSizes.left, texture.height-this.borderSizes.bottom, innerWidth, this.borderSizes.bottom);
    this.bottomRight = createPatch.call(this, texture,
      texture.width-this.borderSizes.right, texture.height-this.borderSizes.bottom, this.borderSizes.right, this.borderSizes.bottom);

    positionPatch.call(this);
  }

  get texture(){
    return this._texture;
  }
  set texture(texture){
    this._texture = texture;
    this.updateTexture(texture);
    texture.once('update', this.updateTexture.bind(this));
  }

  get width(){
    return this._width;
  }
  set width(width){
    this._width = width;
    positionPatch.call(this);
  }

  get height(){
    return this._height;
  }
  set height(height){
    this._height = height;
    positionPatch.call(this);
  }
};

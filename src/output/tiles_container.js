"use strict";

var actions = require('../actions'),
    startTileSelection = actions.startTileSelection,
    continueTileSelection = actions.continueTileSelection,
    endTileSelection = actions.endTileSelection;

function pointFromEvent(e){
  var x = Math.floor((e.data.global.x - this.parent.position.x) / this.worldScale),
      y = Math.floor((e.data.global.y - this.parent.position.y) / this.worldScale);
  return { x, y };
}

class TilesContainer extends PIXI.Container {
  static get textures(){
    return [
      FloorGraphic.texture
    ];
  }

  constructor(){
    super();
    this.tileMap = {};

    this.interactive = true;
  }
  render(gameState){
    let scale = gameState.world.scale,
        size = gameState.world.size,
        center = gameState.world.center,
        height = gameState.windowSize.height / scale,
        width  = gameState.windowSize.width  / scale,
        minY = Math.max(0,    Math.floor(center.y-height/2)),
        maxY = Math.min(size, Math.ceil( center.y+height/2)),
        minX = Math.max(0,    Math.floor(center.x-width /2)),
        maxX = Math.min(size, Math.ceil( center.x+width /2));

    this.worldScale = scale;

    this.renderMap(gameState.world.tiles, minY, maxY, minX, maxX, scale);
  }
  renderMap(tiles, minY, maxY, minX, maxX, scale){
    this.hitArea = new PIXI.Rectangle(0,0, 100*scale,100*scale);

    for (let y in this.tileMap){
      for (let x in this.tileMap[y]){
        if (this.tileMap[y][x] !== tiles[y][x] || x<minX || x>maxX || y<minY || y>maxY){
          this.removeChild(this.tileMap[y][x]);
          delete this.tileMap[y][x];
        }
      }
      if (y<minY || y>maxY){
        delete this.tileMap[y];
      }
    }
    for (let y=minY; y<maxY; y++){
      if (!this.tileMap[y]) this.tileMap[y] = {};
      for (let x=minX; x<maxX; x++){
        if (!this.tileMap[y][x]) {
          this.tileMap[y][x] = this.getTile(tiles, x,y, scale);
          this.addChild( this.tileMap[y][x] );
        }
      }
    }
  }
  getTile(tiles, x, y, scale){
    const tile = tiles[y][x];
    if (tile.type === 'empty') {
      return new PIXI.Container();
    } else if (tile.type === 'floor') {
      return new FloorGraphic(x,y, scale);
    } else {
      throw new Error("TilesContainer#getTile: Unknown tile type: "+tile.type);
    }
  }
  mousedown(e){
    var point = pointFromEvent.call(this, e);
    startTileSelection(point);
    this.isSelecting = true;
  }
  mousemove(e){
    if (!this.isSelecting) return;
    var point = pointFromEvent.call(this, e);
    continueTileSelection(point);
  }
  mouseup(e){
    var point = pointFromEvent.call(this, e);
    endTileSelection(point);
    this.isSelecting = false;
  }
}
TilesContainer.prototype.renderMap = memoize(TilesContainer.prototype.renderMap);

class FloorGraphic extends PIXI.Sprite {
  static get texture(){
    if (this._texture) return this._texture;
    this._texture = PIXI.Texture.fromImage('resources/Floor.png');
    return this._texture;
  }

  constructor(x,y,scale){
    super(FloorGraphic.texture);
    this.position.x = x*scale;
    this.position.y = y*scale;
    this.height = this.width = scale;
  }
}

module.exports = TilesContainer;

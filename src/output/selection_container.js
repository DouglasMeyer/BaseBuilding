"use strict";

class SelectionContainer extends PIXI.Container {
  static get textures(){
    return [
      SelectionGraphic.texture
    ];
  }

  constructor(){
    super()
    this.selectionMap = {};
  }
  render(gameState){
    if (!gameState.world.selection) {
      if (Object.keys(this.selectionMap).length){
        this.removeChildren();
        this.selectionMap = {};
      }
      return;
    }
    let scale = gameState.world.scale,
        center = gameState.world.center,
        height = gameState.windowSize.height / scale,
        width  = gameState.windowSize.width  / scale,
        selection = gameState.world.selection,
        minX = Math.min(selection.start.x, selection.end.x),
        maxX = Math.max(selection.start.x, selection.end.x),
        minY = Math.min(selection.start.y, selection.end.y),
        maxY = Math.max(selection.start.y, selection.end.y);

    this.renderSelection(gameState.world.selection, minY, maxY, minX, maxX, scale);
  }
  renderSelection(selection, minY, maxY, minX, maxX, scale){

    for (let y in this.selectionMap){
      for (let x in this.selectionMap[y]){
        if (x<minX || x>maxX || y<minY || y>maxY){
          this.removeChild(this.selectionMap[y][x]);
          delete this.selectionMap[y][x];
        }
      }
      if (y<minY || y>maxY){
        delete this.selectionMap[y];
      }
    }
    for (let y=minY; y<=maxY; y++){
      if (!this.selectionMap[y]) this.selectionMap[y] = {};
      for (let x=minX; x<=maxX; x++){
        if (!this.selectionMap[y][x]) {
          this.selectionMap[y][x] = new SelectionGraphic(x,y, scale);
          this.addChild( this.selectionMap[y][x] );
        }
      }
    }
  }
}
SelectionContainer.prototype.renderSelection = memoize(SelectionContainer.prototype.renderSelection);

class SelectionGraphic extends PIXI.Sprite {
  static get texture(){
    if (this._texture) return this._texture;
    this._texture = PIXI.Texture.fromImage('resources/CursorCircle.png');
    return this._texture;
  }

  constructor(x,y,scale){
    super(SelectionGraphic.texture);
    this.position.x = x*scale;
    this.position.y = y*scale;
    this.height = this.width = scale;
  }
}

module.exports = SelectionContainer;

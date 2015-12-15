"use strict";

class WorldContainer extends PIXI.Container {
  render(gameState){
    this.renderWorld(gameState.world.center, gameState.windowSize);
  }
  renderWorld(center, windowSize){
    this.position.x = windowSize.width  / 2 - center.x;
    this.position.y = windowSize.height / 2 - center.y;
  }
}
WorldContainer.prototype.renderWorld = memoize(WorldContainer.prototype.renderWorld);

module.exports = WorldContainer;

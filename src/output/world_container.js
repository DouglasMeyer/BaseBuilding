"use strict";

class WorldContainer extends PIXI.Container {
  render(gameState){
    this.renderWorld(gameState.world.center, gameState.windowSize, gameState.world.scale);
  }
  renderWorld(center, windowSize, scale){
    this.position.x = windowSize.width  / 2 - center.x * scale;
    this.position.y = windowSize.height / 2 - center.y * scale;
  }
}
WorldContainer.prototype.renderWorld = memoize(WorldContainer.prototype.renderWorld);

module.exports = WorldContainer;

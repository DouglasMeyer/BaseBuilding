var WorldContainer = require('./output/world_container'),
    TilesContainer = require('./output/tiles_container'),
    renderer, stage,
    hud,
    worldContainer,
      tilesContainer;

function Output(){
  renderer = renderer || PIXI.autoDetectRenderer();
  document.body.appendChild(renderer.view);

  stage = new PIXI.Container();
  stage.addChild( hud = new PIXI.Container() );
  stage.addChild( worldContainer = new WorldContainer() );
  worldContainer.addChild( tilesContainer = new TilesContainer() );
};

Output.prototype.render = memoize(function outputRender(gameState){
  worldContainer.render(gameState);
  tilesContainer.render(gameState);

  renderer.resize(gameState.windowSize.width, gameState.windowSize.height);
  renderer.render(stage);
});

module.exports = Output;

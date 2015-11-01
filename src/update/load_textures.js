var TilesContainer = require('../output/tiles_container'),
    containerTexturesToLoad = [
      TilesContainer.textures
    ],
    texturesToLoad = Array.prototype.concat.apply([], containerTexturesToLoad),
    loadedTextureCount = 0;

texturesToLoad.forEach(function(texture){
  texture.once('update', function(){
    loadedTextureCount += 1;
  });
});

module.exports = function loadTextures(gameState){
  if (gameState.loadedTextureCount === loadedTextureCount) return;

  return copyWith(gameState, {
    loadedTextureCount: loadedTextureCount
  });
};

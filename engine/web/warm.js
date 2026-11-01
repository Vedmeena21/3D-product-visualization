// Compile every shader up front so the first visible frame doesn't stall.
export async function warmComposer(renderer, composer, scene, camera) {
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  composer.render(0);
  composer.render(0);
  renderer.getContext().finish();
}

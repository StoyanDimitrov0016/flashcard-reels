const {
  AndroidConfig,
  CodeGenerator,
  createRunOncePlugin,
  withMainActivity,
} = require("expo/config-plugins");

const packageJson = require("../package.json");

const pluginName = "with-transparent-android-navigation-bar";

function withTransparentAndroidNavigationBar(config) {
  return withMainActivity(config, (mainActivityConfig) => {
    const { modResults } = mainActivityConfig;

    if (modResults.language !== "kt") {
      throw new Error(`${pluginName} requires Expo's Kotlin MainActivity template.`);
    }

    let contents = AndroidConfig.CodeMod.addImports(
      modResults.contents,
      ["android.graphics.Color", "android.os.Build", "androidx.core.view.WindowCompat"],
      false
    );

    contents = CodeGenerator.mergeContents({
      src: contents,
      comment: "    //",
      tag: `${pluginName}-on-create`,
      offset: 1,
      anchor: /super\.onCreate\(null\)/,
      newSrc: "    configureTransparentNavigationBar()",
    }).contents;

    contents = CodeGenerator.mergeContents({
      src: contents,
      comment: "  //",
      tag: `${pluginName}-lifecycle`,
      offset: 0,
      anchor: /  override fun getMainComponentName/,
      newSrc: `  override fun onResume() {
    super.onResume()
    configureTransparentNavigationBar()
  }

  @Suppress("DEPRECATION")
  private fun configureTransparentNavigationBar() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.navigationBarColor = Color.TRANSPARENT

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
    }
  }
`,
    }).contents;

    mainActivityConfig.modResults.contents = contents;
    return mainActivityConfig;
  });
}

module.exports = createRunOncePlugin(
  withTransparentAndroidNavigationBar,
  pluginName,
  packageJson.version
);

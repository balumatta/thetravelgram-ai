/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/login/route";
exports.ids = ["app/api/auth/login/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2Flogin%2Froute&page=%2Fapi%2Fauth%2Flogin%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogin%2Froute.ts&appDir=%2FUsers%2Fbalumatta%2Ffreelance%2Flearning%2Fthetravelgram-ai%2Ffrontend%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fbalumatta%2Ffreelance%2Flearning%2Fthetravelgram-ai%2Ffrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2Flogin%2Froute&page=%2Fapi%2Fauth%2Flogin%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogin%2Froute.ts&appDir=%2FUsers%2Fbalumatta%2Ffreelance%2Flearning%2Fthetravelgram-ai%2Ffrontend%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fbalumatta%2Ffreelance%2Flearning%2Fthetravelgram-ai%2Ffrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_balumatta_freelance_learning_thetravelgram_ai_frontend_src_app_api_auth_login_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/auth/login/route.ts */ \"(rsc)/./src/app/api/auth/login/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/login/route\",\n        pathname: \"/api/auth/login\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/login/route\"\n    },\n    resolvedPagePath: \"/Users/balumatta/freelance/learning/thetravelgram-ai/frontend/src/app/api/auth/login/route.ts\",\n    nextConfigOutput,\n    userland: _Users_balumatta_freelance_learning_thetravelgram_ai_frontend_src_app_api_auth_login_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGbG9naW4lMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkZsb2dpbiUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkZsb2dpbiUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmJhbHVtYXR0YSUyRmZyZWVsYW5jZSUyRmxlYXJuaW5nJTJGdGhldHJhdmVsZ3JhbS1haSUyRmZyb250ZW5kJTJGc3JjJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmJhbHVtYXR0YSUyRmZyZWVsYW5jZSUyRmxlYXJuaW5nJTJGdGhldHJhdmVsZ3JhbS1haSUyRmZyb250ZW5kJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUM2QztBQUMxSDtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90aGV0cmF2ZWxncmFtLWFpLz9kZmViIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvYmFsdW1hdHRhL2ZyZWVsYW5jZS9sZWFybmluZy90aGV0cmF2ZWxncmFtLWFpL2Zyb250ZW5kL3NyYy9hcHAvYXBpL2F1dGgvbG9naW4vcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2F1dGgvbG9naW4vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9hdXRoL2xvZ2luXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9hdXRoL2xvZ2luL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL2JhbHVtYXR0YS9mcmVlbGFuY2UvbGVhcm5pbmcvdGhldHJhdmVsZ3JhbS1haS9mcm9udGVuZC9zcmMvYXBwL2FwaS9hdXRoL2xvZ2luL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2Flogin%2Froute&page=%2Fapi%2Fauth%2Flogin%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogin%2Froute.ts&appDir=%2FUsers%2Fbalumatta%2Ffreelance%2Flearning%2Fthetravelgram-ai%2Ffrontend%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fbalumatta%2Ffreelance%2Flearning%2Fthetravelgram-ai%2Ffrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/./src/app/api/auth/login/route.ts":
/*!*****************************************!*\
  !*** ./src/app/api/auth/login/route.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\nconst COOKIE_NAME = \"ttg_admin\";\nconst COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days\nasync function generateToken(secret) {\n    const enc = new TextEncoder();\n    const key = await crypto.subtle.importKey(\"raw\", enc.encode(secret), {\n        name: \"HMAC\",\n        hash: \"SHA-256\"\n    }, false, [\n        \"sign\"\n    ]);\n    const sig = await crypto.subtle.sign(\"HMAC\", key, enc.encode(\"ttg_admin_session_v1\"));\n    return Array.from(new Uint8Array(sig)).map((b)=>b.toString(16).padStart(2, \"0\")).join(\"\");\n}\nasync function POST(request) {\n    const { password } = await request.json();\n    if (!password || password !== process.env.ADMIN_PASSWORD) {\n        // Constant delay to prevent timing attacks\n        await new Promise((r)=>setTimeout(r, 400));\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Invalid password\"\n        }, {\n            status: 401\n        });\n    }\n    const token = await generateToken(process.env.ADMIN_SECRET);\n    const response = next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        success: true\n    });\n    response.cookies.set(COOKIE_NAME, token, {\n        httpOnly: true,\n        secure: \"development\" === \"production\",\n        sameSite: \"strict\",\n        maxAge: COOKIE_MAX_AGE,\n        path: \"/\"\n    });\n    return response;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9hdXRoL2xvZ2luL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQXdEO0FBRXhELE1BQU1DLGNBQWM7QUFDcEIsTUFBTUMsaUJBQWlCLElBQUksS0FBSyxLQUFLLElBQUksU0FBUztBQUVsRCxlQUFlQyxjQUFjQyxNQUFjO0lBQ3pDLE1BQU1DLE1BQU0sSUFBSUM7SUFDaEIsTUFBTUMsTUFBTSxNQUFNQyxPQUFPQyxNQUFNLENBQUNDLFNBQVMsQ0FDdkMsT0FDQUwsSUFBSU0sTUFBTSxDQUFDUCxTQUNYO1FBQUVRLE1BQU07UUFBUUMsTUFBTTtJQUFVLEdBQ2hDLE9BQ0E7UUFBQztLQUFPO0lBRVYsTUFBTUMsTUFBTSxNQUFNTixPQUFPQyxNQUFNLENBQUNNLElBQUksQ0FBQyxRQUFRUixLQUFLRixJQUFJTSxNQUFNLENBQUM7SUFDN0QsT0FBT0ssTUFBTUMsSUFBSSxDQUFDLElBQUlDLFdBQVdKLE1BQzlCSyxHQUFHLENBQUMsQ0FBQ0MsSUFBTUEsRUFBRUMsUUFBUSxDQUFDLElBQUlDLFFBQVEsQ0FBQyxHQUFHLE1BQ3RDQyxJQUFJLENBQUM7QUFDVjtBQUVPLGVBQWVDLEtBQUtDLE9BQW9CO0lBQzdDLE1BQU0sRUFBRUMsUUFBUSxFQUFFLEdBQUcsTUFBTUQsUUFBUUUsSUFBSTtJQUV2QyxJQUFJLENBQUNELFlBQVlBLGFBQWFFLFFBQVFDLEdBQUcsQ0FBQ0MsY0FBYyxFQUFFO1FBQ3hELDJDQUEyQztRQUMzQyxNQUFNLElBQUlDLFFBQVEsQ0FBQ0MsSUFBTUMsV0FBV0QsR0FBRztRQUN2QyxPQUFPaEMscURBQVlBLENBQUMyQixJQUFJLENBQUM7WUFBRU8sT0FBTztRQUFtQixHQUFHO1lBQUVDLFFBQVE7UUFBSTtJQUN4RTtJQUVBLE1BQU1DLFFBQVEsTUFBTWpDLGNBQWN5QixRQUFRQyxHQUFHLENBQUNRLFlBQVk7SUFDMUQsTUFBTUMsV0FBV3RDLHFEQUFZQSxDQUFDMkIsSUFBSSxDQUFDO1FBQUVZLFNBQVM7SUFBSztJQUVuREQsU0FBU0UsT0FBTyxDQUFDQyxHQUFHLENBQUN4QyxhQUFhbUMsT0FBTztRQUN2Q00sVUFBVTtRQUNWQyxRQUFRZixrQkFBeUI7UUFDakNnQixVQUFVO1FBQ1ZDLFFBQVEzQztRQUNSNEMsTUFBTTtJQUNSO0lBRUEsT0FBT1I7QUFDVCIsInNvdXJjZXMiOlsid2VicGFjazovL3RoZXRyYXZlbGdyYW0tYWkvLi9zcmMvYXBwL2FwaS9hdXRoL2xvZ2luL3JvdXRlLnRzP2QzMWEiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuXG5jb25zdCBDT09LSUVfTkFNRSA9IFwidHRnX2FkbWluXCI7XG5jb25zdCBDT09LSUVfTUFYX0FHRSA9IDcgKiAyNCAqIDYwICogNjA7IC8vIDcgZGF5c1xuXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVRva2VuKHNlY3JldDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZW5jID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gIGNvbnN0IGtleSA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuaW1wb3J0S2V5KFxuICAgIFwicmF3XCIsXG4gICAgZW5jLmVuY29kZShzZWNyZXQpLFxuICAgIHsgbmFtZTogXCJITUFDXCIsIGhhc2g6IFwiU0hBLTI1NlwiIH0sXG4gICAgZmFsc2UsXG4gICAgW1wic2lnblwiXVxuICApO1xuICBjb25zdCBzaWcgPSBhd2FpdCBjcnlwdG8uc3VidGxlLnNpZ24oXCJITUFDXCIsIGtleSwgZW5jLmVuY29kZShcInR0Z19hZG1pbl9zZXNzaW9uX3YxXCIpKTtcbiAgcmV0dXJuIEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoc2lnKSlcbiAgICAubWFwKChiKSA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpXG4gICAgLmpvaW4oXCJcIik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcXVlc3Q6IE5leHRSZXF1ZXN0KSB7XG4gIGNvbnN0IHsgcGFzc3dvcmQgfSA9IGF3YWl0IHJlcXVlc3QuanNvbigpO1xuXG4gIGlmICghcGFzc3dvcmQgfHwgcGFzc3dvcmQgIT09IHByb2Nlc3MuZW52LkFETUlOX1BBU1NXT1JEKSB7XG4gICAgLy8gQ29uc3RhbnQgZGVsYXkgdG8gcHJldmVudCB0aW1pbmcgYXR0YWNrc1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDQwMCkpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIkludmFsaWQgcGFzc3dvcmRcIiB9LCB7IHN0YXR1czogNDAxIH0pO1xuICB9XG5cbiAgY29uc3QgdG9rZW4gPSBhd2FpdCBnZW5lcmF0ZVRva2VuKHByb2Nlc3MuZW52LkFETUlOX1NFQ1JFVCEpO1xuICBjb25zdCByZXNwb25zZSA9IE5leHRSZXNwb25zZS5qc29uKHsgc3VjY2VzczogdHJ1ZSB9KTtcblxuICByZXNwb25zZS5jb29raWVzLnNldChDT09LSUVfTkFNRSwgdG9rZW4sIHtcbiAgICBodHRwT25seTogdHJ1ZSxcbiAgICBzZWN1cmU6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSBcInByb2R1Y3Rpb25cIixcbiAgICBzYW1lU2l0ZTogXCJzdHJpY3RcIixcbiAgICBtYXhBZ2U6IENPT0tJRV9NQVhfQUdFLFxuICAgIHBhdGg6IFwiL1wiLFxuICB9KTtcblxuICByZXR1cm4gcmVzcG9uc2U7XG59XG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiQ09PS0lFX05BTUUiLCJDT09LSUVfTUFYX0FHRSIsImdlbmVyYXRlVG9rZW4iLCJzZWNyZXQiLCJlbmMiLCJUZXh0RW5jb2RlciIsImtleSIsImNyeXB0byIsInN1YnRsZSIsImltcG9ydEtleSIsImVuY29kZSIsIm5hbWUiLCJoYXNoIiwic2lnIiwic2lnbiIsIkFycmF5IiwiZnJvbSIsIlVpbnQ4QXJyYXkiLCJtYXAiLCJiIiwidG9TdHJpbmciLCJwYWRTdGFydCIsImpvaW4iLCJQT1NUIiwicmVxdWVzdCIsInBhc3N3b3JkIiwianNvbiIsInByb2Nlc3MiLCJlbnYiLCJBRE1JTl9QQVNTV09SRCIsIlByb21pc2UiLCJyIiwic2V0VGltZW91dCIsImVycm9yIiwic3RhdHVzIiwidG9rZW4iLCJBRE1JTl9TRUNSRVQiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJjb29raWVzIiwic2V0IiwiaHR0cE9ubHkiLCJzZWN1cmUiLCJzYW1lU2l0ZSIsIm1heEFnZSIsInBhdGgiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/auth/login/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fauth%2Flogin%2Froute&page=%2Fapi%2Fauth%2Flogin%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogin%2Froute.ts&appDir=%2FUsers%2Fbalumatta%2Ffreelance%2Flearning%2Fthetravelgram-ai%2Ffrontend%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fbalumatta%2Ffreelance%2Flearning%2Fthetravelgram-ai%2Ffrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();
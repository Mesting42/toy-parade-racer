# 素材来源与模型溯源

核对日期：2026-10-18。运行时所有模型、纹理、字体和声音均来自本地文件或本地生成代码。

| 内容 | 来源与许可 | 本地位置 |
| --- | --- | --- |
| 历史角色卡丁车源文件（当前赛车不再使用） | [Kenney Car Kit](https://kenney.nl/assets/car-kit)，CC0 1.0 | `assets/kenney-car-kit/` 保存原包和源文件；`public/assets/kenney-car-kit/` 保存运行 GLB、纹理、License.txt、SOURCE.md |
| 六种无人物玩具车、门架、模块路肩、三类坡道、模型树 | [Kenney Toy Car Kit](https://kenney.nl/assets/toy-car-kit)，CC0 1.0 | `assets/kenney-toy-car-kit/` 保存完整原包和源文件；`public/assets/kenney-toy-car-kit/` 保存运行 GLB、纹理、License.txt、SOURCE.md。2026-10-19 从本地原包追加 `vehicle-drag-racer`、`vehicle-vintage-racer`、`vehicle-suv`，供六车使用不同模型。 |
| 看台与兼容起点/坡道模型 | [Kenney Racing Kit](https://kenney.nl/assets/racing-kit)，CC0 1.0 | `assets/kenney-racing-kit/` 与 `public/assets/kenney-racing-kit/` |
| 九条闭合路线、地形、木纹/纸纹/织物纹理、主题地标 | 本项目程序化生成 | `src/tracks.js`、`src/world.js` |
| 车身涂装、号码牌、细化轮胎/轮毂/灯组/玻璃/格栅/饰件与模型装配 | 基于上述 CC0 模型的项目内程序化修改，无新增外部素材；环境反射由本地 Three.js RoomEnvironment 生成 | `src/world.js`、`src/car-models.js`、`src/car-details.js` |
| 品牌图标与界面 | 本项目原创 SVG/CSS | `public/brand-mark.svg`、`src/style.css`、`src/main.js` |
| 推进喷焰、烟尾、能量护罩、火箭、爆炸、冲击环与磁场 | 本项目程序化几何与 GLSL 着色器，无新增外部素材 | `src/item-effects.js`、`src/combat.js` |
| 音乐和音效 | 本项目 Web Audio 合成 | `src/audio.js` |
| ZCOOL KuaiLe 字体 | npm 包 `@fontsource/zcool-kuaile`，SIL OFL 1.1 | 本地依赖及构建输出 |
| Three.js | npm 包 `three`，MIT | 本地依赖及构建输出 |
| Vite | npm 包 `vite`，MIT | 本地构建依赖 |

CC0 原始许可文件随每个素材包保存。署名 Kenney 是自愿致谢；项目保留来源记录，便于重新下载、修改和分发。上方网址仅供溯源，游戏不会访问远程素材。

## 参考项目《夜行赛道》

本次仅只读检查 `D:\AnLi\夜行赛道`。其 `ASSET-LICENSES.md` 明确记录车辆由 `src/render.js` 原创程序化建模；路线和环境来自 `src/tracks.js`、`src/render.js` 与 `src/environments.js`。公开资源目录中没有外部赛车或赛道 GLB/GLTF/OBJ 模型包。因此，当前可核对的模型出处是该项目本身的生成代码，没有发现第三方下载来源。

《玩具巡游赛》参考其模型层次、道路边界和景深处理，使用独立的明亮玩具配色、Kenney CC0 无人物玩具赛车及原创手工场景。没有向《夜行赛道》目录写入文件。

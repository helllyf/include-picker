var _core = require("./core");

var createElement = _core.createElement;

var util = require("../core/util");

var logError = require("../core/log");

var Path = require("../graphic/Path");

var ZImage = require("../graphic/Image");

var ZText = require("../graphic/Text");

var arrayDiff = require("../core/arrayDiff2");

var GradientManager = require("./helper/GradientManager");

var ClippathManager = require("./helper/ClippathManager");

var ShadowManager = require("./helper/ShadowManager");

var _graphic = require("./graphic");

var svgPath = _graphic.path;
var svgImage = _graphic.image;
var svgText = _graphic.text;

/**
 * SVG Painter
 * @module zrender/svg/Painter
 */
function parseInt10(val) {
  return parseInt(val, 10);
}

function getSvgProxy(el) {
  if (el instanceof Path) {
    return svgPath;
  } else if (el instanceof ZImage) {
    return svgImage;
  } else if (el instanceof ZText) {
    return svgText;
  } else {
    return svgPath;
  }
}

function checkParentAvailable(parent, child) {
  return child && parent && child.parentNode !== parent;
}

function insertAfter(parent, child, prevSibling) {
  if (checkParentAvailable(parent, child) && prevSibling) {
    var nextSibling = prevSibling.nextSibling;
    nextSibling ? parent.insertBefore(child, nextSibling) : parent.appendChild(child);
  }
}

function prepend(parent, child) {
  if (checkParentAvailable(parent, child)) {
    var firstChild = parent.firstChild;
    firstChild ? parent.insertBefore(child, firstChild) : parent.appendChild(child);
  }
} // function append(parent, child) {
//     if (checkParentAvailable(parent, child)) {
//         parent.appendChild(child);
//     }
// }


function remove(parent, child) {
  if (child && parent && child.parentNode === parent) {
    parent.removeChild(child);
  }
}

function getTextSvgElement(displayable) {
  return displayable.__textSvgEl;
}

function getSvgElement(displayable) {
  return displayable.__svgEl;
}
/**
 * @alias module:zrender/svg/Painter
 * @constructor
 * @param {HTMLElement} root 绘图容器
 * @param {module:zrender/Storage} storage
 * @param {Object} opts
 */


var SVGPainter = function (root, storage, opts, zrId) {
  this.root = root;
  this.storage = storage;
  this._opts = opts = util.extend({}, opts || {});
  var svgDom = createElement('svg');
  svgDom.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgDom.setAttribute('version', '1.1');
  svgDom.setAttribute('baseProfile', 'full');
  svgDom.style.cssText = 'user-select:none;position:absolute;left:0;top:0;';
  var bgRoot = createElement('g');
  svgDom.appendChild(bgRoot);
  var svgRoot = createElement('g');
  svgDom.appendChild(svgRoot);
  this.gradientManager = new GradientManager(zrId, svgRoot);
  this.clipPathManager = new ClippathManager(zrId, svgRoot);
  this.shadowManager = new ShadowManager(zrId, svgRoot);
  var viewport = document.createElement('div');
  viewport.style.cssText = 'overflow:hidden;position:relative';
  this._svgDom = svgDom;
  this._svgRoot = svgRoot;
  this._backgroundRoot = bgRoot;
  this._viewport = viewport;
  root.appendChild(viewport);
  viewport.appendChild(svgDom);
  this.resize(opts.width, opts.height);
  this._visibleList = [];
};

SVGPainter.prototype = {
  constructor: SVGPainter,
  getType: function () {
    return 'svg';
  },
  getViewportRoot: function () {
    return this._viewport;
  },
  getSvgDom: function () {
    return this._svgDom;
  },
  getSvgRoot: function () {
    return this._svgRoot;
  },
  getViewportRootOffset: function () {
    var viewportRoot = this.getViewportRoot();

    if (viewportRoot) {
      return {
        offsetLeft: viewportRoot.offsetLeft || 0,
        offsetTop: viewportRoot.offsetTop || 0
      };
    }
  },
  refresh: function () {
    var list = this.storage.getDisplayList(true);

    this._paintList(list);
  },
  setBackgroundColor: function (backgroundColor) {
    // TODO gradient
    // Insert a bg rect instead of setting background to viewport.
    // Otherwise, the exported SVG don't have background.
    if (this._backgroundRoot && this._backgroundNode) {
      this._backgroundRoot.removeChild(this._backgroundNode);
    }

    var bgNode = createElement('rect');
    bgNode.setAttribute('width', this.getWidth());
    bgNode.setAttribute('height', this.getHeight());
    bgNode.setAttribute('x', 0);
    bgNode.setAttribute('y', 0);
    bgNode.setAttribute('id', 0);
    bgNode.style.fill = backgroundColor;

    this._backgroundRoot.appendChild(bgNode);

    this._backgroundNode = bgNode;
  },
  _paintList: function (list) {
    this.gradientManager.markAllUnused();
    this.clipPathManager.markAllUnused();
    this.shadowManager.markAllUnused();
    var svgRoot = this._svgRoot;
    var visibleList = this._visibleList;
    var listLen = list.length;
    var newVisibleList = [];
    var i;

    for (i = 0; i < listLen; i++) {
      var displayable = list[i];
      var svgProxy = getSvgProxy(displayable);
      var svgElement = getSvgElement(displayable) || getTextSvgElement(displayable);

      if (!displayable.invisible) {
        if (displayable.__dirty) {
          svgProxy && svgProxy.brush(displayable); // Update clipPath

          this.clipPathManager.update(displayable); // Update gradient and shadow

          if (displayable.style) {
            this.gradientManager.update(displayable.style.fill);
            this.gradientManager.update(displayable.style.stroke);
            this.shadowManager.update(svgElement, displayable);
          }

          displayable.__dirty = false;
        }

        newVisibleList.push(displayable);
      }
    }

    var diff = arrayDiff(visibleList, newVisibleList);
    var prevSvgElement; // First do remove, in case element moved to the head and do remove
    // after add

    for (i = 0; i < diff.length; i++) {
      var item = diff[i];

      if (item.removed) {
        for (var k = 0; k < item.count; k++) {
          var displayable = visibleList[item.indices[k]];
          var svgElement = getSvgElement(displayable);
          var textSvgElement = getTextSvgElement(displayable);
          remove(svgRoot, svgElement);
          remove(svgRoot, textSvgElement);
        }
      }
    }

    for (i = 0; i < diff.length; i++) {
      var item = diff[i];

      if (item.added) {
        for (var k = 0; k < item.count; k++) {
          var displayable = newVisibleList[item.indices[k]];
          var svgElement = getSvgElement(displayable);
          var textSvgElement = getTextSvgElement(displayable);
          prevSvgElement ? insertAfter(svgRoot, svgElement, prevSvgElement) : prepend(svgRoot, svgElement);

          if (svgElement) {
            insertAfter(svgRoot, textSvgElement, svgElement);
          } else if (prevSvgElement) {
            insertAfter(svgRoot, textSvgElement, prevSvgElement);
          } else {
            prepend(svgRoot, textSvgElement);
          } // Insert text


          insertAfter(svgRoot, textSvgElement, svgElement);
          prevSvgElement = textSvgElement || svgElement || prevSvgElement; // zrender.Text only create textSvgElement.

          this.gradientManager.addWithoutUpdate(svgElement || textSvgElement, displayable);
          this.shadowManager.addWithoutUpdate(svgElement || textSvgElement, displayable);
          this.clipPathManager.markUsed(displayable);
        }
      } else if (!item.removed) {
        for (var k = 0; k < item.count; k++) {
          var displayable = newVisibleList[item.indices[k]];
          var svgElement = getSvgElement(displayable);
          var textSvgElement = getTextSvgElement(displayable);
          var svgElement = getSvgElement(displayable);
          var textSvgElement = getTextSvgElement(displayable);
          this.gradientManager.markUsed(displayable);
          this.gradientManager.addWithoutUpdate(svgElement || textSvgElement, displayable);
          this.shadowManager.markUsed(displayable);
          this.shadowManager.addWithoutUpdate(svgElement || textSvgElement, displayable);
          this.clipPathManager.markUsed(displayable);

          if (textSvgElement) {
            // Insert text.
            insertAfter(svgRoot, textSvgElement, svgElement);
          }

          prevSvgElement = svgElement || textSvgElement || prevSvgElement;
        }
      }
    }

    this.gradientManager.removeUnused();
    this.clipPathManager.removeUnused();
    this.shadowManager.removeUnused();
    this._visibleList = newVisibleList;
  },
  _getDefs: function (isForceCreating) {
    var svgRoot = this._svgDom;
    var defs = svgRoot.getElementsByTagName('defs');

    if (defs.length === 0) {
      // Not exist
      if (isForceCreating) {
        var defs = svgRoot.insertBefore(createElement('defs'), // Create new tag
        svgRoot.firstChild // Insert in the front of svg
        );

        if (!defs.contains) {
          // IE doesn't support contains method
          defs.contains = function (el) {
            var children = defs.children;

            if (!children) {
              return false;
            }

            for (var i = children.length - 1; i >= 0; --i) {
              if (children[i] === el) {
                return true;
              }
            }

            return false;
          };
        }

        return defs;
      } else {
        return null;
      }
    } else {
      return defs[0];
    }
  },
  resize: function (width, height) {
    var viewport = this._viewport; // FIXME Why ?

    viewport.style.display = 'none'; // Save input w/h

    var opts = this._opts;
    width != null && (opts.width = width);
    height != null && (opts.height = height);
    width = this._getSize(0);
    height = this._getSize(1);
    viewport.style.display = '';

    if (this._width !== width || this._height !== height) {
      this._width = width;
      this._height = height;
      var viewportStyle = viewport.style;
      viewportStyle.width = width + 'px';
      viewportStyle.height = height + 'px';
      var svgRoot = this._svgDom; // Set width by 'svgRoot.width = width' is invalid

      svgRoot.setAttribute('width', width);
      svgRoot.setAttribute('height', height);
    }

    if (this._backgroundNode) {
      this._backgroundNode.setAttribute('width', width);

      this._backgroundNode.setAttribute('height', height);
    }
  },

  /**
   * 获取绘图区域宽度
   */
  getWidth: function () {
    return this._width;
  },

  /**
   * 获取绘图区域高度
   */
  getHeight: function () {
    return this._height;
  },
  _getSize: function (whIdx) {
    var opts = this._opts;
    var wh = ['width', 'height'][whIdx];
    var cwh = ['clientWidth', 'clientHeight'][whIdx];
    var plt = ['paddingLeft', 'paddingTop'][whIdx];
    var prb = ['paddingRight', 'paddingBottom'][whIdx];

    if (opts[wh] != null && opts[wh] !== 'auto') {
      return parseFloat(opts[wh]);
    }

    var root = this.root; // IE8 does not support getComputedStyle, but it use VML.

    var stl = document.defaultView.getComputedStyle(root);
    return (root[cwh] || parseInt10(stl[wh]) || parseInt10(root.style[wh])) - (parseInt10(stl[plt]) || 0) - (parseInt10(stl[prb]) || 0) | 0;
  },
  dispose: function () {
    this.root.innerHTML = '';
    this._svgRoot = this._backgroundRoot = this._svgDom = this._backgroundNode = this._viewport = this.storage = null;
  },
  clear: function () {
    if (this._viewport) {
      this.root.removeChild(this._viewport);
    }
  },
  toDataURL: function () {
    this.refresh();
    var html = encodeURIComponent(this._svgDom.outerHTML.replace(/></g, '>\n\r<'));
    return 'data:image/svg+xml;charset=UTF-8,' + html;
  }
}; // Not supported methods

function createMethodNotSupport(method) {
  return function () {
    logError('In SVG mode painter not support method "' + method + '"');
  };
} // Unsuppoted methods


util.each(['getLayer', 'insertLayer', 'eachLayer', 'eachBuiltinLayer', 'eachOtherLayer', 'getLayers', 'modLayer', 'delLayer', 'clearLayer', 'pathToImage'], function (name) {
  SVGPainter.prototype[name] = createMethodNotSupport(name);
});
var _default = SVGPainter;
module.exports = _default;
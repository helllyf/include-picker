const vscode = require('vscode');
const path = require('path');
const fs = require('fs')
const readline = require('readline');
let ws = vscode.workspace;
const NONE_NAME = "";
const NONE_PATH = "";


//循环引用影响编译效率
// 难度还是很大，如果同一工程下不同目录下有同名头文件。
/****
 * https://www.cnblogs.com/geeking/p/4021044.html
api文档
https://code.visualstudio.com/api/references/vscode-api#workspace
脚手架
https://www.cnblogs.com/liuxianan/p/vscode-plugin-hello-world.html
1、通过Include头文件（忽略系统头文件）展示文件之间的关系
2、要考虑性能，5000万代码量5分钟内完成
3、图形美观
1、通过文件之间的关系向上卷积文件夹之间的关系。初始展示工程中顶层文件夹之间的关系，可以逐层展开
2、分析过程中，在Output窗口输出循环依赖的文件链条。
 */


//data 下存储所有的文件名
/**
 * data edges 用于顶点图展示
 */
//文件名原始数据
let IFOriFiles = {
    names: new Array(), // 假设文件名具有唯一性
    paths: new Array(), // 
    add: function(_filename, _filepath = NONE_PATH) {
        if(_filename == NONE_NAME) {
            return {index: -1, isNew: false}
        }
        //console.log("my:"+ _filepath)
        var _index = this.indexOf(_filename);
        if(_index != -1) {
            if(_filepath != NONE_PATH) {
                this.updatePathByIndex(_index, _filepath)
                return {index: _index, isNew: false}
            }else {
                return {index: _index, isNew: false}
            }
        }

        this.names.push(_filename)
        this.paths.push(_filepath)
        return {index: this.names.length - 1, isNew: true}
    },
    indexOf: function(_filename) {
        return this.names.indexOf(_filename);
    },
    updateName: function(_index, _filename) {
        if(_index < 0 || _index >= this.names.length) {
            return false
        }

        this.names[_index] = _filename
    },
    updatePathByIndex: function(_index, _filepath) {
        if(_index < 0 || _index >= this.paths.length) {
            return false
        }
        this.paths[_index] = _filepath
        return true
    },
    updatePathByName: function(_filename, _filepath) {
        var _index = this.indexOf(_filename);
        this.updatePathByIndex(_index, _filepath);
        return _index;
    },
    getFilePathById: function(_id) {
        return this.paths[_id];
    }
}

// var data = new Array();
// //filepaths 对应data下标的文件路径
// var filePaths = new Array();
let IFChartData = {
    data: new Array(),
    add: function(_data) {
        this.data.push(_data)
    },
    updata: function(_index, _data) {
        this.data[_index] = _data
    }
}
//edges 包含所有文件包含关系。
/**
 * source: id
 * target: id
 */
const LOOPEDGE = "red"

let IFChartEdge = {
    edgeSet: new Set(),
    edges: new Array,
    add: function(_sourceId, _targetId) {
        if(_sourceId == -1 || _targetId == -1)  return
        this.edgeSet.add(this.edgeGen(_sourceId,_targetId))
    },
    edgeGen: function( _sourceId,  _targetId) {
        return _sourceId + "|" + _targetId
    },
    setColor: function(_colorEdge, _color) {
        for(let edge of this.edgeSet) {
            var tmp = edge.split("|");
            var newedge = {
                source: parseInt(tmp[0]),
                target:parseInt(tmp[1])
            }
            if(_colorEdge.has(edge)) {
                newedge.lineStyle = { color: _color,width: 5 }
            }
            this.edges.push(newedge)
        }
    }
}
    
    

/**
 * cFile: index Of CExtfile C文件的下标
 * 每个 c文件都要进行一次DFS检测
 * 
 * 数据处理
 * index = data's index 
 * [[index,index,index],[x,x,x],[x,x,x]]
 * 变成了一个有向图检测是否存在环路的过程。
 * 传统的有向图检测是否存在环路的方法
 * 1. 不断删去出度为0的结点以及与之相连的边，如果到最后还有点没有删去则证明有环. 
 * 2. https://kb.kutu66.com/algorithm/post_12410575 DFS加标记。 O(N+E)，其中 NN 是图中的节点数，EE 是图中的边数。
 * 上述的时间复杂度还需要加上O(x)，文件IO处理所花费的时间，这部分很耗时。
 * 
 * 重复引用
 * a.c => [b.h,c.h]
 *          b.h => d.h => g.h => c.h
 * 
 * 循环引用
 * a.c => b.h => c.h => b.h
 */
//不保证输入数据准确性

let IFLoopCook = {
    cFile: new Set(),
    allIncludeges: new Array(),
    tempath: new Array(), // 某条路径
    respaths: new Set(),   //所有路径集合
    resEdges: new Set(), //需要标红的路径
    haschecked: new Set(), // 已检文件，防止重复检查
    outputMeg: new Array(),
    cFileAdd: function(_index) {
        this.cFile.add(_index)
    },
    allIncludgesAdd: function() {
        var newSet = new Set()
        this.allIncludeges.push(newSet)
    },
    FIncludeFs: function(_sourceIndex, _targetIndex) {
        this.allIncludeges[_sourceIndex].add(_targetIndex)
        //处理文件关系
    },
    CIncludeLoop: function(_index) {
        //如果路径上检测到已存在
        var preindex = this.tempath.indexOf(_index)
        if( preindex != -1) {
            var loopath = this.tempath.slice(preindex)
            loopath.push(_index)
            this.respaths.add(loopath)
            return
        }
        //如果该文件已做过环路检查，则返回。
        if(this.haschecked.has(_index))  {
            return
        }
        this.tempath.push(_index)
        for(let i of this.allIncludeges[_index]) {
            if(path.dirname(IFOriFiles.paths[i]) != '.') {
                dirRel.updateDir(
                    path.dirname(IFOriFiles.paths[_index]),
                    path.dirname(IFOriFiles.paths[i])
                    , true) //update dir color
            }
            this.CIncludeLoop(i)
        }
        this.haschecked.add(_index)
        this.tempath.pop()
    },
    SetEchartEdges: function() {
        for(let respath of this.respaths) {
            var str = ""
            for(let i = 0; i< respath.length-1; i++) {
                this.resEdges.add(IFChartEdge.edgeGen(respath[i], respath[i+1]))
                //IFChartEdge.setColor(respath[i], respath[i+1], LOOPEDGE)
                str = str + IFOriFiles.names[respath[i]] +"=>"
            }
            str += "\n";
            if(respath.length > 0) {
                str = IFOriFiles.paths[respath[0]] + ":\n" + str + IFOriFiles.names[respath[respath.length-1]]
                console.log(str)
                this.outputMeg.push(str);
            }
        }
        IFChartEdge.setColor(this.resEdges, LOOPEDGE)
    },
    CIncludeLoopAll: function() {
        for(let i of this.cFile) {
            this.tempath.splice(0,this.tempath.length);
            this.CIncludeLoop(i); 
        }  
        this.SetEchartEdges();
    },
    OutputMessage: function(folder) {
        fs.writeFileSync(folder+ "\\include-picker-result.txt","include picker results:\n");
        for(let i of this.outputMeg) {
            fs.appendFileSync(folder+ "\\include-picker-result.txt",i);
        }
    }
}



let CFileCook = function(oriAdd) {
    if(oriAdd.isNew == true ) {
        IFLoopCook.cFileAdd(oriAdd.index)
    }
    return {symbolSize: 15 ,
              itemStyle: {
                color: '#BD5692'
            }}
}

let HFileCook = function(oriAdd) {
    return {symbolSize: 10, itemStyle: {color: '#A68B36'}};
}

var CEX = ['.c','.cpp','.cc','.h','hpp']
let tmpCookFile = async function(_path) {
    var ex = path.extname(_path)
    if(CEX.indexOf(ex) != -1) {
        await processLineByLine(_path);
    }
}
function ExtCook(filename, oriAdd) {
    var ext = path.extname(filename)
    switch(ext) {
        case '.c':
            return CFileCook(oriAdd);
        case '.h':
        default:
            return HFileCook(oriAdd);
    }
}

//正则表达式 是否检测头文件已结束
var reg = ['VOID','void','#ifdef','#if',
    'UCHAR', 'uchar','unsigned char','CHAR','char',
    'UINT8','uint8','UINT16','uint16','UINT32','uint32', 'UINT64','uint64',
    'unsigned int','UINT','int','INT',
    'short', 'SHORT','unsigned short','USHORT',
    'long','LONG','unsigned long','ULONG',
    'float','FLOAT',
    'double','DOUBLE',
    'static', 'const', 'auto','register','extern','struct','typedef','union','signed','volatile']

let isEnd = function(_str) {
    return false;
    /*
    for(var i = 0; i < reg.length ; ++i) {
        var regTmp = "^" + reg[i] + " ";
        var regE = new RegExp(regTmp, 'i')
        return regE.test(_str);
    }
    */
}

// add return value for line test, if test is all content, return-value is invalid 
function GetIncludeFile(_filepath, textString) {
    if(isEnd(textString)) {
        return false
    }
    var filename = path.basename(_filepath)
    if(filename == NONE_NAME) {
        return false;
    }
    var sourceId = AddNode(filename, _filepath)

    var reg = /#include\s("|<)(\S*)("|>)/g;
    var str = reg.exec(textString);
    while(str != null) {
        var targetId = AddNode(str[2])
        IFChartEdge.add(sourceId, targetId) //考虑回环处理时候增加边，加颜色
        IFLoopCook.FIncludeFs(sourceId,targetId)
        str = reg.exec(textString)
    }
    return true
}

function RemoveComments(textString) {
    var regStr = /(\/\/.*)|(\/\*[\s\S]*?\*\/)/g;
    textString = textString.replace(regStr,'');
    return textString;
}

async function processLineByLine(_path) {
    const fileStream = fs.createReadStream(_path);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    // 注意：我们使用 crlfDelay 选项将 input.txt 中的所有 CR LF 实例（'\r\n'）识别为单个换行符。
    for await (const line of rl) {
        if(!GetIncludeFile(_path, line)) {
            break;
        }
    }
}



let GetDirRelation = async function( _path, _folder ) {
    if(!_folder){
        _path = _path
    }else{
        _path = path.join(_path, _folder)
    }
    var files = {}
    var ds = fs.readdirSync(_path) // 获取目录下的 文件和文件夹
    for(let i=0,len=ds.length;i<len;i++){
        var _pathTrg = path.join(_path,ds[i])
        var result = fs.statSync(_pathTrg)
        if(result.isDirectory()) {
            dirRel.updateDir(_path, _pathTrg)
            files[ds[i]] = await GetDirRelation(_path,ds[i])
        } else if(result.isFile()) {
            await tmpCookFile(_pathTrg)
        }
    }
    return files
}



//耦合： 原始数据的下标与展示数据以及循环检测数据是一致的。在原始数据中新增文件，后两者均要新增。
function AddNode(_filename, _filepath = NONE_PATH) {
    if(_filename == NONE_NAME) {
        return -1
    }
    // 获取数据下标，下表将代表文件
    var oriAdd = IFOriFiles.add(_filename, _filepath);
    if(oriAdd.index == -1) {
        return -1
    }
    var style = ExtCook(_filename, oriAdd);
    var newdata = {id: oriAdd.index, name: _filename, symbolSize: style.symbolSize, itemStyle: style.itemStyle};
    if(oriAdd.isNew == false) {
        IFChartData.updata(oriAdd.index, newdata)
    } else {
        IFChartData.add(newdata)
        IFLoopCook.allIncludgesAdd()
    }
    return oriAdd.index
}

 
let debug = true
async function GetAll(panel, updateChart)  {
    if(debug) {
        console.time("Array initialize");
        let workspaceFolders = await vscode.workspace.workspaceFolders;
        for(var i = 0;i<workspaceFolders.length;i++) {
            var folder = path.resolve(workspaceFolders[i].uri.fsPath)
            dirRel.setRoot(folder)
            await GetDirRelation( folder)
            IFLoopCook.CIncludeLoopAll();
            IFLoopCook.OutputMessage(folder);
        }
        //await GetAllCo();
        console.timeEnd("Array initialize"); 
    }
    debug = false;
    updateChart(panel,{data:IFChartData.data, edges: Array.from(IFChartEdge.edges)}, dirRel.echatData);
}

let dirRel = {
    dirRelation: new Array(), //存储目录关系 [new array]
    oriDir: new Array(), //存储所有目录
    echatData: {name:'',path:'', children:[]},
    setRoot: function(_path) {
        if(this.oriDir.length == 0) {
            this.oriDir.push(_path)
            this.addDriRelation();
        } else {
            this.oriDir[0] = _path
        }
        this.echatData.name = path.basename(_path)
        this.echatData.path = _path
    },
    getIndexOrAdd: function(_path) {
        if(_path == "") {
            return -1
        }
        var _index = this.indexOf(_path)
        if(_index == -1) {
            this.oriDir.push(_path)
            this.addDriRelation();
            return this.oriDir.length - 1
        } else {
            return _index
        }
    },
    indexOf: function( _path ) {
        return this.oriDir.indexOf(_path);
    },
    addDriRelation: function() {
        var s = new Array();
        this.dirRelation.push(s);
    },
    getEchatStyle: function(_path, isCall) {
        var t = {}
        t.name = path.basename(_path)
        t.path = _path
        t.children = new Array()
        if(isCall == true) {
            this.echartAddStyle(t)
        }
        return t
    },
    echartAddStyle: function(t) {
        t.itemStyle = {
            color : '#0000ff',
            borderColor:'#0000ff'
        };
        t.lineStyle = {
            color : 'blue',
            borderColor:'#0000ff'
        }
    },
    updateDir: function(_pathSrc, _pathTrg, isCall = false) {
        var _indexSrc = this.getIndexOrAdd(_pathSrc)
        var _indexTrg = this.getIndexOrAdd(_pathTrg)
        var _indexChild = this.dirRelation[_indexSrc].indexOf(_indexTrg);
        if(( _indexChild!= -1 && isCall == false) || (_indexSrc == _indexTrg)) {
            //已存在
            return
        }
        //遍历找到echat的child, 从工作区路径后面开始找
        var _pathSrc = _pathSrc.slice(this.echatData.path.length)
        var pathSrcVec = []
        if(_pathSrc != '')
            pathSrcVec = _pathSrc.split(path.sep)
        var _obj = this.echatData
        var _path = this.echatData.path

        for(var i = 0; i< pathSrcVec.length;i++) {
            if(pathSrcVec[i] == '') continue
            _obj = this.getObj(_path, _path +"\\"+ pathSrcVec[i], _obj)
            _path = _path +"\\" + pathSrcVec[i]
        }
        //更新echart表信息
        //  判断是否已存在，如果不存在则新增，存在则更新 obj
        if(_indexChild == -1) {
            this.dirRelation[_indexSrc].push(_indexTrg)
            _indexChild = this.dirRelation[_indexSrc].length - 1      
            _obj.children.push(this.getEchatStyle(_pathTrg,isCall))      
        } else {
            this.echartAddStyle(_obj.children[_indexChild])
        }

    },
    getObj: function(_Ppath, _Cpath, _obj) {
        var _Pindex = this.oriDir.indexOf(_Ppath)
        var _Cindex = this.oriDir.indexOf(_Cpath)
        var _indexChild = this.dirRelation[_Pindex].indexOf(_Cindex)
        return _obj.children[_indexChild]
    }
}


let GetAllCo = async function() {    
    var results = await ws.findFiles('**/*.{c,cpp,cc,h,hpp}');
    const allPromises = []
    for(const v of results) {
        allPromises.push(
            ws.openTextDocument(v).then(doc => {
                var textString = doc.getText(
                    new vscode.Range(
                        new vscode.Position(0,0), 
                        new vscode.Position(doc.lineCount,0))
                    )
                textString = RemoveComments(textString);
                GetIncludeFile(doc.fileName, textString);
            })
        )
    }
    await Promise.all(allPromises)
}    

let GetFilePath = function(id) {
    return IFOriFiles.getFilePathById(id)
}
    

module.exports = {
    GetAll,
    GetFilePath
}
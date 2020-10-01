const testMode = false; // 为true时可以在浏览器打开不报错
// vscode webview 网页和普通网页的唯一区别：多了一个acquireVsCodeApi方法
const vscode = testMode ? {} : acquireVsCodeApi();
var dom = document.getElementById("container");
var myChart = echarts.init(dom);
var data = [];
var edges = [];
var option = {
    title: {text: 'Include Picker'},
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series : [{
            type: 'graph',
            layout: 'force',
            name: 'file',
            data: data,
            edges: edges,
            force: {
                repulsion: 100,
                edgeLength: 15
            },
            emphasis: {
                label: {
                    position: 'right',
                    show: true
                }
            },
            roam: true,
            focusNodeAdjacency: true,
            lineStyle: {
                width: 0.5,
                curveness: 0.3,
                opacity: 0.7
            }
        }]}
myChart.setOption(option,true);
window.addEventListener('message', event => {
    updateChart(event.data)
});
let updateChart = function(_message) {
    myChart.hideLoading()
    //option.series[0].data = option.series[0].data.concat(_message.dataGrap.data);
    //option.series[0].edges = option.series[0].edges.concat(_message.dataGrap.edges);
    option.series[0].data = _message.dataGrap.data;
    option.series[0].edges = _message.dataGrap.edges;
    myChart.setOption(option,true);
}

myChart.on('click', function(param) {
    //console.log(param);
    if(param.dataType == 'node') {
        vscode.postMessage({id: param.data.id});
    } else if(param.dataType == 'edge') {
        vscode.postMessage({id: param.data.target});
    }
});
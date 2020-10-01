const testMode = false; // 为true时可以在浏览器打开不报错
// vscode webview 网页和普通网页的唯一区别：多了一个acquireVsCodeApi方法
const vscode = testMode ? {} : acquireVsCodeApi();
var dom = document.getElementById("container");
var myChart = echarts.init(dom);
var option = {
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    tooltip: {
        formatter: function(params) {
            console.log(JSON.stringify(params.data.path))
            return params.data.path;
        }},
    series : [{
            type: 'tree',
            layout: 'force',
            name: 'dictory',
            textStyle: {
                color: 'yellow'
            },
            roam: true,
            label: {
                normal: {  
                    textStyle: {
                        fontSize: 15,
                        fontWeight: 'bold',
                        color: 'yellow'
                    }
                }
            }, 
            data: []
        }]
}
myChart.setOption(option,true);
window.addEventListener('message', event => {
    updateChart(event.data)
});
let updateChart = function(_message) {
    myChart.hideLoading()
    option.series[0].data[0] = _message.dataTree;
    myChart.setOption(option); 
}
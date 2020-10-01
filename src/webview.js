const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const includePicker = require('./includepicker');

function getWebViewContent(context, templatePath) {
    const resourcePath = path.join(context.extensionPath, templatePath);
    const dirPath = path.dirname(resourcePath);
    let html = fs.readFileSync(resourcePath, 'utf-8');
    // vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
    html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
        return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
    });
    return html;
}
let updateChart = function(panel, respG, respT) {
    panel.webview.postMessage({cmd: 'updateChart', dataGrap: respG, dataTree: respT});
}

let OpenFileInWindow = function(filePath) {
    if(filePath == "") {
        vscode.window.showInformationMessage('目录下未找到该文件');   
        return;
    }
    
    vscode.workspace.openTextDocument(filePath)
    .then(doc => {
        // 在VSCode编辑窗口展示读取到的文本
        vscode.window.showTextDocument(doc);
    }, err => {
        console.log(`Open ${filePath} error, ${err}.`);
    }).then(undefined, err => {
        console.log(`Open ${filePath} error, ${err}.`);
    })
}

module.exports = function(context) {
    context.subscriptions.push(vscode.commands.registerCommand('include.graph', function (uri) {
        const panel = vscode.window.createWebviewPanel(
            'graph', // viewType
            "include graph", // 视图标题
            vscode.ViewColumn.One, // 显示在编辑器的哪个部位
            {
                enableScripts: true, // 启用JS，默认禁用
                retainContextWhenHidden: true, // webview被隐藏时保持状态，避免被重置
            }
        );
        panel.webview.html = getWebViewContent(context, 'src/view/graph-include.html');
        panel.webview.onDidReceiveMessage(message => {
            console.log('插件收到的消息：', message);
            var filepath = includePicker.GetFilePath(message.id);
            OpenFileInWindow(filepath);
        }, undefined, context.subscriptions);

        includePicker.GetAll(panel, updateChart)
    }));

    context.subscriptions.push(vscode.commands.registerCommand('include.tree', function (uri) {
        const panel = vscode.window.createWebviewPanel(
            'tree', // viewType
            "include tree", // 视图标题
            vscode.ViewColumn.One, // 显示在编辑器的哪个部位
            {
                enableScripts: true, // 启用JS，默认禁用
                retainContextWhenHidden: true, // webview被隐藏时保持状态，避免被重置
            }
        );
        panel.webview.html = getWebViewContent(context, 'src/view/tree-include.html');
        panel.webview.onDidReceiveMessage(message => {
            console.log('插件收到的消息：', message);
        }, undefined, context.subscriptions);

        includePicker.GetAll(panel, updateChart)
    }));
};
    
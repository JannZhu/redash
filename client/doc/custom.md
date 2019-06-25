# 自定义元素修改手册

### 修改远程地址
> REDASH_BACKEND="http://dv.in-road.com" npm run start
> REDASH_BACKEND="http://192.168.31.30:5000" npm run start

### 修改圆角边框, 阴影
> /Users/jannzhu/Projects/redash/client/app/pages/dashboards/dashboard.less
>
>> .dashboard-wrapper下的.title `border-radius: 16px;box-shadow:  0px 4px 2px #eee;` 

### 修改柱状图，饼图的颜色
> /Users/jannzhu/Projects/redash/client/app/visualizations/ColorPalette.js
>
>> ```css
>>{Blue: '#356AFF',
>>Red: '#E92828',
>>Green: '#3BD973',
>>Purple: '#604FE9',
>>Cyan: '#50F5ED',
>>Orange: '#FB8D3D',
>>'Light Blue': '#799CFF',
>>Lilac: '#B554FF',
>>'Light Green': '#8CFFB4',
>>Brown: '#A55F2A',
>>Black: '#000000',
>>Gray: '#494949',
>>Pink: '#FF7DE3',
>>'Dark Blue': '#002FB4'}
>> ```

### 修改barchart 加入条状的黑边框  (边框圆角无该属性设置，除非是svg)
> /Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js
prepareChartData > 替换原来的  marker: { color: seriesColor }
marker: {
  line: {
    color: '#3B5169',
    width: 1,
  },
},
### 修改linechart 为lines+markers
>> /Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js  setType
>series.mode = 'lines+markers';


### 修改lengen的定位 
>Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js

垂直方向的y 不能做到水平居中layout.legend = {
      orientation: 'h',
      // locate legend inside of plot area - otherwise plotly will preserve
      // some amount of space under the plot; also this will limit legend height
      // to plot's height
      y: 0,
      x: 0,
      xanchor: 'left',
      yanchor: 'bottom',
    }

### 修改line+makers 的像素从6->12 讨论否决
>Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js 
>```js
> series.marker = {
>   size: 12,
> };
>```
### 修改 桑基图颜色
>/Users/jannzhu/Projects/redash/client/app/visualizations/sankey/index.js
>```js
>// const color = d3.scale.category20();//修改 桑基图颜色
>const color = ['#A44891', '#C88DBC', '#2F6DB6', '#92A0C3', '#00CCFF', '#A0E5F6', '#99C0AE', '#CADCD4', '#EFAA89', '#EBC4B3', '#7548A4', '#A483C6', '#104481', '#5378A4', '#009BFF', '#66C3FF', '#49886B', '#92B8A6', '#F96E3C', '#FBA88A'];
>data = graph(data);
>// data.nodes = _.map(data.nodes, d => _.extend(d, { color: color(d.name.replace(/ .*/, '')) })); //修改 桑基图颜色
>data.nodes = _.map(data.nodes, (d, index) => _.extend(d, { color: color[index % 20] }));
>```

> /Users/jannzhu/Projects/redash/client/app/assets/less/inc/visualizations/sankey.less
> 

#修改 heatsmap 颜色
>Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js
>注释掉前面一段 直接赋值就成
>colorScheme = defaultColorScheme;

#修改圆环的hole
>Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js 
 hole: 0.4-> hole: 0.6
---
### 改变深色主题样式
# 修改颜色
>/Users/jannzhu/Projects/redash/client/app/assets/less/inc/variables.less
@text-color: #ffffff;

# 修改背景
>/Users/jannzhu/Projects/redash/client/app/assets/less/redash/redash-newstyle.less
>> body > background

# 修改tile 背景
> /Users/jannzhu/Projects/redash/client/app/assets/less/inc/tile.less
>> .tile 
# 注释了tile的阴影
/Users/jannzhu/Projects/redash/client/app/pages/dashboards/dashboard.less

# 修改 chart的背景颜色 
> Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js 
>paper_bgcolor: 'rgba(255, 255, 255, 0.1)',

# 修改了chart的背景色
> /Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js  > prepareLayout
> paper_bgcolor
> plot_bgcolor 

# 修改了 chart的内边距
> /Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js
// pad: 4,

# 修改了 x轴和Y轴的样式 （bubble和heat另外处理）
> /Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js
if (options.globalSeriesType === 'bubble' || options.globalSeriesType === 'heatmap') {
      result.xaxis.linecolor = 'rgba(51, 109, 255, 1)';
      result.xaxis.linewidth = 2;
      result.xaxis.mirror = 'ticks';
    } else {
      result.xaxis.showgrid = false;
    }

# 修改了 y轴默认有gridcolor
> /Users/jannzhu/Projects/redash/client/app/visualizations/chart/plotly/utils.js
gridcolor: 'rgba(51, 109, 255, 0.5)',

# 修改了表格颜色
> /Users/jannzhu/Projects/redash/client/app/assets/less/inc/variables.less
/* --------------------------------------------------------
    Tables
-----------------------------------------------------------*/
@table-bg:                              rgba(0,0,0,0);
@table-border-color:                    rgba(51, 109, 255, 0.5);
@table-cell-padding:                    10px;
@table-condensed-cell-padding:          7px;
@table-bg-accent:                       @light-gray;
@table-bg-active:                       #FFFCBE;
@table-bg-hover:                        lighten(@light-gray, 2%);

> /Users/jannzhu/Projects/redash/client/app/assets/less/redash/redash-table.less
// color: #333;

> /Users/jannzhu/Projects/redash/client/app/assets/less/inc/table.less
// color: #333

# 主食editingmode的网格线
> /Users/jannzhu/Projects/redash/client/app/pages/dashboards/dashboard.less
开始整体注释掉 &.editing-mode {
---


### 临时记录
How to customize Plotly Tooltip
https://community.plot.ly/t/how-to-customize-plotly-tooltip/332
---
https://www.w3.org/wiki/Dynamic_style_-_manipulating_CSS_with_JavaScript  >>>Adding and Removing Rules
<style type="text/css" class="cp-pen-styles">body {
  background: black
}</style>
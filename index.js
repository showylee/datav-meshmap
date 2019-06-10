var Event = require('bcore/event');
var $ = require('jquery');
var _ = require('lodash');
var EChart = require('echarts');
var Utils = require('datav:/com/maliang-echarts-utils/0.0.18');
require('echarts/dist/extension/bmap');
require('echarts/dist/extension/dataTool');
const world = require('echarts/map/json/world.json');


/**
 * 马良基础类
 */
module.exports = Event.extend(function Base(container, config) {
  this.config = {
    series: [], bmap: { center: [], mapStyle: {}}, geo: { center: [] }, visualMap: { inRange: { color: [], apacity: 0 } }
  }
  this.container = $(container);           //容器
  this.apis = config.apis;                 //hook一定要有
  this._data = null;                       //数据
  this.chart = null;                       //图表
  this.init(config);
}, {
  /**
   * 公有初始化
   */
  init: function (config) {
     
    //1.初始化,合并配置
    this.mergeConfig(config);
    //EChart.registerMap('world', world);
    this.chart = EChart.init(this.container[0]);

    const key = "8BB7F0E5C9C77BD6B9B655DB928B74B6E2D838FD"; 
    const src = "http://api.map.baidu.com/api?v=2.0&ak="+key+"&callback=onBMapCallback";
    return new Promise((resolve, reject) => {
      // 如果已加载直接返回
      if(typeof BMap !== "undefined") {
        resolve(BMap);
        return true;
      }
      // 百度地图异步加载回调处理
      window.onBMapCallback = function () {
        console.log("百度地图脚本初始化成功...");
        resolve(BMap);
      };

      const script = document.createElement("script");
      script.setAttribute("type", "text/javascript");
      script.setAttribute("src", src);
      document.body.appendChild(script);
    });

    console.log(Utils.config2echartsOptions(config));
    this.chart.setOption(Utils.config2echartsOptions(config));
    //2.刷新布局,针对有子组件的组件 可有可无
    //this.updateLayout();
    //3.子组件实例化
    //this.chart = new Chart(this.container[0], this.config);
    //4.如果有需要, 更新样式
    //this.updateStyle();
  },
  /**
   * 绘制
   * @param data
   * @param options 不一定有
   * !!注意: 第二个参数支持config, 就不需要updateOptions这个方法了
   */
  render: function (data, config) {
    config = this.mergeConfig(config);
    EChart.registerMap('world', world);
    data = this.data(data);
//    var cfg = Utils.config2echartsOptions(this.mergeConfig(Utils.data2echartsAxis(data, config)));

//    this.chart.setOption(cfg);
    //更新图表
    //this.chart.render(data, cfg);
    //this.container.html(data[0].value)
    //如果有需要的话,更新样式
    //this.updateStyle();
  },
  /**
   *
   * @param width
   * @param height
   */
  resize: function (width, height) {
    this.chart.resize({
      width: width,
      height: height
    })
    //this.updateLayout(width, height);
    //更新图表
    //this.chart.render({
    //  width: width,
    //  height: height
    //})
  },
  /**
   * 每个组件根据自身需要,从主题中获取颜色 覆盖到自身配置的颜色中.
   * 暂时可以不填内容
   */
  setColors: function () {
    //比如
    //var cfg = this.config;
    //cfg.color = cfg.theme.series[0] || cfg.color;
  },
  /**
   * 数据,设置和获取数据
   * @param data
   * @returns {*|number}
   */
  data: function (data) {
    if (data) {
      this._data = data;
    }
    return this._data;
  },
  /**
   * 更新配置
   * 优先级: config.colors > config.theme > this.config.theme > this.config.colors
   * [注] 有数组的配置一定要替换
   * @param config
   * @private
   */
  mergeConfig: function (config) {
    if (!config) {return this.config}

    if (config.series) {
      const obj = { 
        renderItem: function (params, api){
          var lngExtent = [39.5, 40.6];
          var latExtent = [115.9, 116.8];
          var cellCount = [50, 50];
          var cellSizeCoord = [
              (lngExtent[1] - lngExtent[0]) / cellCount[0],
              (latExtent[1] - latExtent[0]) / cellCount[1]
          ];
          var context = params.context;
          var lngIndex = api.value(0);
          var latIndex = api.value(1);
          var coordLeftTop = [
              +(latExtent[0] + lngIndex * cellSizeCoord[0]).toFixed(6),
              +(lngExtent[0] + latIndex * cellSizeCoord[1]).toFixed(6)
          ];

          function getCoord(params, api, lngIndex, latIndex) {
            var coords = params.context.coords || (params.context.coords = []);
            var key = lngIndex + '-' + latIndex;
        
            // bmap returns point in integer, which makes cell width unstable.
            // So we have to use right bottom point.
            return coords[key] || (coords[key] = api.coord([
                +(latExtent[0] + lngIndex * cellSizeCoord[0]).toFixed(6),
                +(lngExtent[0] + latIndex * cellSizeCoord[1]).toFixed(6)
            ]));
          }
          var pointLeftTop = getCoord(params, api, lngIndex, latIndex);
          var pointRightBottom = getCoord(params, api, lngIndex + 1, latIndex + 1);

          return {
              type: 'rect',
              shape: {
                  x: pointLeftTop[0],
                  y: pointLeftTop[1],
                  width: pointRightBottom[0] - pointLeftTop[0],
                  height: pointRightBottom[1] - pointLeftTop[1]
              },
              style: api.style({
                  stroke: 'rgba(0,0,0,0.1)'
              }),
              styleEmphasis: api.styleEmphasis()
          };       
        }
      };

      config.series.forEach((d, i) => {
        if (d.data) {
          this.config.series[i].data = d.data;
        }
        //this.config.series[i].renderItem = this.renderItem();
        this.config.series[i] = obj; 
        
        this.config.series[i] = _.defaultsDeep(d || {}, this.config.series[i]);
        this.config.series[i].type = 'custom';
      });
      this.config.series = _.take(this.config.series, config.series.length)
      this.config.series.push({ type: 'map', map: 'world' });
    }
    if (config.bmap) {
      this.config.bmap.center = [116.46, 39.92];
      //console.log(config.bmap.mapStyle.styleJson);
      //var json = JSON.parse(JSON.stringify(config.bmap.mapStyle.styleJson));
      //console.log(typeof(json));
      this.config.bmap.mapStyle = {};
    }
    if (config.visualMap) {
      this.config.visualMap.inRange.color = ["#070093", "#1c3fbf", "#1482e5", "#70b4eb", "#b4e0f3", "#ffffff"];
      this.config.visualMap.inRange.apacity = 0.7;
    }
    if (config.geo) {
      this.config.geo.center = [116.46, 39.92];
    }

    this.config.theme = _.defaultsDeep(config.theme || {}, this.config.theme);
    this.setColors();
    this.config = _.defaultsDeep(config || {}, this.config);
    return this.config;
  },
  /**
   * 更新布局
   * 可有可无
   */
  updateLayout: function () {},
  /**
   * 更新样式
   * 有些子组件控制不到的,但是需要控制改变的,在这里实现
   */
  updateStyle: function () {
    var cfg = this.config;
    this.container.css({
      'font-size': cfg.size + 'px',
      'color': cfg.color || '#fff'
    });
  },
  /**
   * 更新配置
   * !!注意:如果render支持第二个参数options, 那updateOptions不是必须的
   */
  //updateOptions: function (options) {},
  /**
   * 更新某些配置
   * 给可以增量更新配置的组件用
   */
  //updateXXX: function () {},
  clear: function(){
    this.chart && this.chart.clear && this.chart.clear();
  },
  /**
   * 销毁组件
   */
   destroy: function(){
     this.chart && this.chart.dispose && this.chart.dispose();
   }
});

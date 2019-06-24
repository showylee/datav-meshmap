var Event = require('bcore/event');
var $ = require('jquery');
var _ = require('lodash');
var EChart = require('echarts');
var Utils = require('datav:/com/maliang-echarts-utils/0.0.18');
require('./bmap');
require('./dataTool');


/**
 * 马良基础类
 */
module.exports = Event.extend(function Base(container, config) {
  this.config = {
    series: [],
    bmap: { center: [], mapStyle: {} },
    visualMap: { inRange: { color: [] } }
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
      window.onBMapCallback = () => {
        resolve(BMap);
        this.chart.setOption(Utils.config2echartsOptions(this.mergeConfig(config)));
      };

      const script = document.createElement("script");
      script.setAttribute("type", "text/javascript");
      script.setAttribute("src", src);
      document.body.appendChild(script);
    });

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
    data = this.data(data);
    this.chart.setOption(Utils.config2echartsOptions(this.mergeConfig(config)));
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
    });
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
          // get meshcode data
          const meshcode = String(api.value(0));
          console.log(meshcode);

          if (meshcode.length !== 8){
            return true;
          }

          const aryMesh = meshcode.match(/.{2}/g); 
          const latCodes = [];
          const lngCodes = [];
          aryMesh.forEach((d, i) => {
            if (i < 2) {
              // primary mesh code.
              if (i == 0) {
                latCodes.push(Number(d));
              }else{
                lngCodes.push(Number(d));
              }
            }else{
              // secondary and third order mesh code.
              const tmp = d.match(/.{1}/g);
              latCodes.push(Number(tmp[0]));
              lngCodes.push(Number(tmp[1]));
            }
          });

          function getCoord(params, api, meshcodes){
            const latMesh = meshcodes[0];
            const lngMesh = meshcodes[1];

            var coords = params.context.coords || (params.context.coords = []);
            let key = latMesh[1]+latMesh[2] + '-' + lngMesh[1] + lngMesh[2];

            const lat = (latMesh[0] / 1.5 * 3600 + latMesh[1] * 5 * 60 + latMesh[2] * 30 ) / 3600;
            const lng = ((lngMesh[0] + 100) * 3600 + lngMesh[1] * 7.5 * 60 + lngMesh[2] * 45) / 3600;

            return coords[key] || (coords[key] = api.coord([+lng, +lat]));
          }

          const codes = [latCodes, lngCodes];
          const RightTopCodes = [[],[]];

          const pointLeftBottom = getCoord(params, api, codes);

          const prefix = 1;
          codes.forEach((d, i) => {
            // third order meshcode move up
            if (d[2] == 9){
              // secondary meshcode move up
              if (d[1] == 7){
                RightTopCodes[i].push(d[0] + prefix);
                RightTopCodes[i].push(0);
                RightTopCodes[i].push(0);
              }else{
                RightTopCodes[i].push(d[0]);
                RightTopCodes[i].push(d[1] + prefix);
                RightTopCodes[i].push(0);
              }
            }else{
              RightTopCodes[i] = d;
              RightTopCodes[i][2] = d[2] + prefix;
            }
          });
          const pointRightTop = getCoord(params, api, RightTopCodes);

          return {
            type: 'rect',
            shape: {
              x: pointLeftBottom[0],
              y: pointLeftBottom[1],
              width: pointRightTop[0] - pointLeftBottom[0],
              height: pointRightTop[1] - pointLeftBottom[1]
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
        this.config.series[i] = obj; 
        
        if (this._data){
          const data = [];
          this._data.forEach((d, i) => {
            data.push([d.meshcode, d.value]);
          });
          this.config.series[i].data = data;
        }

        this.config.series[i] = _.defaultsDeep(d || {}, this.config.series[i]);
        this.config.series[i].type = 'custom';
      });
      this.config.series = _.take(this.config.series, config.series.length)
    }
    if (config.bmap) {
      this.config.bmap.center = [Number(config.bmap.latCenter), Number(config.bmap.lngCenter)];
      this.config.bmap.mapStyle = {};
    }
    if (config.visualMap) {

      this.config.visualMap.inRange.color = _.map(config.visualMap.pieces, "color")
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

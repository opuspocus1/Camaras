<template>
  <div class="ezuikit-js">
    <div>
      <div id="video-container" style="width: 600px; height: 400px"></div>
    </div>
    <div>
      <button v-on:click="init">init</button>
      <button v-on:click="stop">stop</button>
      <button v-on:click="play">play</button>
      <button v-on:click="openSound">openSound</button>
      <button v-on:click="closeSound">closeSound</button>
      <button v-on:click="startSave">startSave</button>
      <button v-on:click="stopSave">stopSave</button>
      <button v-on:click="capturePicture">capturePicture</button>
      <button v-on:click="fullScreen">fullScreen</button>
      <button v-on:click="getOSDTime">getOSDTime</button>
      <button v-on:click="ezopenStartTalk">startTalk</button>
      <button v-on:click="ezopenStopTalk">stopTalk</button>
      <button v-on:click="destroy">destroy</button>
    </div>
  </div>
</template>

<script>
import { EZUIKitPlayer } from "ezuikit-js";
var player = null;

export default {
  name: "Player",
  props: {
    msg: String,
  },
  mounted: () => {
    console.group("mounted 组件挂载完毕状态===============》");
  },
  methods: {
    init() {
      if (player) {
        this.destroy();
      }

      // fetch("https://open.ys7.com/jssdk/ezopen/demo/token")
      //   .then((response) => response.json())
      //   .then((res) => {
      //     var accessToken = res.data.accessToken;

      //   });
      player = new EZUIKitPlayer({
        id: "video-container", // 视频容器ID
        accessToken:
          "at.d525oyj8d7bwohb40ssn3266cfq2mwi2-8hgpypehn9-1fafaty-ea2fxbc1",
        url: "ezopen://open.ys7.com/BC7799091/1.hd.live",
        // simple: 极简版; pcLive: pc直播; pcRec: pc回放; mobileLive: 移动端直播; mobileRec: 移动端回放;security: 安防版; voice: 语音版;
        template: "pcLive",
        // plugin: ["talk"], // 加载插件，talk-对讲
        width: 600,
        height: 400,
        handleError: (error) => {
          console.error("handleError", error);
        },
        // language: "en", // zh | en
        // staticPath: "/ezuikit_static", // 如果想使用本地静态资源，请复制根目录下ezuikit_static 到当前目录下， 然后设置该值
        env: {
          // https://open.ys7.com/help/1772?h=domain
          // domain默认是 https://open.ys7.com, 如果是私有化部署或海外的环境，请配置对应的domain
          // The default domain is https://open.ys7.com If it is a private deployment or overseas (outside of China) environment, please configure the corresponding domain
          domain: "https://open.ys7.com",
        },
        // staticPath:"https://openstatic.ys7.com/ezuikit_js/v8.1.9/ezuikit_static",
        // 日志打印设置
        loggerOptions: {
          // player.setLoggerOptions(options)
          level: "INFO", // INFO LOG  WARN  ERROR
          name: "ezuikit",
          showTime: true,
        },
        // 视频流的信息回调类型
        /**
         * 打开流信息回调，监听 streamInfoCB 事件
         * 0 : 每次都回调
         * 1 : 只回调一次
         * 注意：会影响性能
         * 默认值 1
         */
        streamInfoCBType: 1,
      });

      player.eventEmitter.on(EZUIKitPlayer.EVENTS.videoInfo, (info) => {
        console.log("videoinfo", info);
      });

      player.eventEmitter.on(EZUIKitPlayer.EVENTS.audioInfo, (info) => {
        console.log("audioInfo", info);
      });

      // 首帧渲染成功
      // first frame display
      player.eventEmitter.on(EZUIKitPlayer.EVENTS.firstFrameDisplay, () => {
        console.log("firstFrameDisplay ");
      });
      player.eventEmitter.on(EZUIKitPlayer.EVENTS.streamInfoCB, (info) => {
        console.log("streamInfoCB ", info);
      });

      window.player = player;
    },
    play() {
      var playPromise = player.play();
      playPromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
    stop() {
      var stopPromise = player.stop();
      stopPromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
    getOSDTime() {
      var getOSDTimePromise = player.getOSDTime();
      getOSDTimePromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
    capturePicture() {
      var capturePicturePromise = player.capturePicture(
        `${new Date().getTime()}`
      );
      capturePicturePromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
    openSound() {
      var openSoundPromise = player.openSound();
      openSoundPromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
    closeSound() {
      var openSoundPromise = player.closeSound();
      openSoundPromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
    startSave() {
      var startSavePromise = player.startSave(`${new Date().getTime()}`);
      startSavePromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
    stopSave() {
      var stopSavePromise = player.stopSave();
      stopSavePromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
    ezopenStartTalk() {
      player.startTalk();
    },
    ezopenStopTalk() {
      player.stopTalk();
    },
    fullScreen() {
      player.fullScreen();
    },
    destroy() {
      var destroyPromise = player.destroy();
      destroyPromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
      player = null;
    },
  },
};
</script>

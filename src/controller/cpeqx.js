'use strict';

import Base from './base.js';
import request from 'request';

const headers = {
  'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
};

export default class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction(){

    if(this.isAjax()){
      let { href, username, password } = this.param();

      let jar = request.jar();
      let httpClient = request.defaults({jar});
      let id = await new Promise((resolve, reject)=>{
        httpClient.get(href, {headers},(error, response, body)=>{
          if(error) reject(error);
          else{
            let id = body.match(/id:(\d+),/)[1];
            resolve(id);
          }
        });
      });

      // 源页面列表
      let srcPageList = await new Promise((resolve, reject)=>{
        httpClient.get(`http://s1.eqxiu.com/eqs/page/${id}`, {headers}, (error, response, body)=>{
          if(error) reject(error);
          else{
            resolve(JSON.parse(body).list);
          }
        });
      });

      jar = request.jar();
      httpClient = request.defaults({jar});

      // 登录
      await new Promise((resolve, reject)=>{
        httpClient.post('http://service.eqxiu.com/login', {form:{username,password,rememberMe:'true'},headers}, (error, response, body)=>{
          resolve(body);
        });
      })
      // 创建场景
      let sceneId = await new Promise((resolve, reject)=>{
        httpClient.post('http://service.eqxiu.com/m/scene/create', {form:{name:'ngsyun',type:101,pageMode:2}}, (error, response, body)=>{
          if(error) reject(error);
          else{
            resolve(JSON.parse(body).obj);
          }
        });
      });

      let pageList = await new Promise((resolve, reject)=>{
        httpClient.get(`http://service.eqxiu.com/m/scene/pageList/${sceneId}`, (error, response, body)=>{
          if(error) reject(error);
          else{
            resolve(JSON.parse(body).list);
          }
        });
      });
      let createCount = srcPageList.length - pageList.length;
      while(createCount > 0){
        createCount--;
        await new Promise((resolve, reject)=>{
          httpClient.get(`http://service.eqxiu.com/m/scene/createPage/${pageList[0].id}`, (error, response, body)=>{
            if(error) reject(error);
            else{
              resolve(body);
            }
          });
        });
      }

      pageList = await new Promise((resolve, reject)=>{
        httpClient.get(`http://service.eqxiu.com/m/scene/pageList/${sceneId}`, (error, response, body)=>{
          if(error) reject(error);
          else{
            resolve(JSON.parse(body).list);
          }
        });
      });

      let pageCount = pageList.length;
      while(pageCount > 0){
        pageCount--;

        await new Promise((resolve, reject)=>{
          httpClient.post('http://service.eqxiu.com/m/scene/save', {
            body:JSON.stringify({
              ...srcPageList[pageCount],
              id: pageList[pageCount].id,
              sceneId: pageList[pageCount].sceneId
            })
          }, (error, response, body)=>{
            if(error) reject(error);
            else{
              resolve(body);
            }
          })
        });
      }

      return this.success('ok');
    }else{
      return this.display();
    }
  }
}

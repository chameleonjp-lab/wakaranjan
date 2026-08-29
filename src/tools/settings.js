import {getSettings,resetSettings,updateSettings} from '../lib/settings.js';

function selected(value,expected){return value===expected?' selected':''}

export function renderSettings(app){
  const current=getSettings();
  app.innerHTML=`<section class="lesson-head"><div class="eyebrow">設定</div><h1>表示・音・動き</h1><p class="lead">この端末のブラウザにだけ保存されます。音声を使う教材が追加されたときも、ここで音のオン・オフを引き継げます。</p></section>
  <section class="panel settings-panel"><label class="settings-field" for="settings-display"><strong>文字の大きさ</strong><span>教材を読みやすくするための表示倍率です。</span><select id="settings-display"><option value="system"${selected(current.displayScale,'system')}>標準</option><option value="large"${selected(current.displayScale,'large')}>大きめ</option><option value="larger"${selected(current.displayScale,'larger')}>さらに大きめ</option></select></label>
  <label class="settings-field settings-check" for="settings-sound"><span><strong>音</strong><small>音声・効果音を使う教材で再生を許可する</small></span><input id="settings-sound" type="checkbox"${current.sound?' checked':''}></label>
  <label class="settings-field" for="settings-motion"><strong>動き</strong><span>端末の「視差効果を減らす」設定にも合わせられます。</span><select id="settings-motion"><option value="system"${selected(current.reducedMotion,'system')}>端末設定に合わせる</option><option value="on"${selected(current.reducedMotion,'on')}>動きを少なくする</option><option value="off"${selected(current.reducedMotion,'off')}>通常の動き</option></select></label>
  <div id="settings-status" class="callout" role="status">変更は自動的に保存されます。</div>
  <div class="action-row"><button id="reset-settings" class="secondary" type="button">設定を初期値に戻す</button><a class="primary" href="#home">ホームへ戻る</a></div></section>
  <section class="panel"><h2>最後に開いたページ</h2><p>ハッシュなしでサイトを開いたとき、最後に開いていたページへ戻ります。</p><div class="action-row"><a class="secondary" href="${current.lastRoute}">最後のページを開く</a></div></section>`;
  const display=app.querySelector('#settings-display');
  const sound=app.querySelector('#settings-sound');
  const motion=app.querySelector('#settings-motion');
  const status=app.querySelector('#settings-status');
  const save=()=>{updateSettings({displayScale:display.value,sound:sound.checked,reducedMotion:motion.value});document.documentElement.dataset.displayScale=display.value;document.documentElement.dataset.sound=sound.checked?'on':'off';document.documentElement.dataset.reducedMotion=motion.value;status.textContent='設定を保存しました。'};
  display.addEventListener('change',save);sound.addEventListener('change',save);motion.addEventListener('change',save);
  app.querySelector('#reset-settings').addEventListener('click',()=>{resetSettings();renderSettings(app)});
}

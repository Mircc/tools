/* Security explainer modal (index page) */
(function () {
    var flowZh = [
        '[ 发信方 (本地浏览器) ]',
        '   │',
        '   ├── 1. 输入明文内容',
        '   ├── 2. 调用底层 Web Crypto API，在本地生成 [AES-GCM 256位 密钥🔑]',
        '   ├── 3. 使用该密钥在本地极速加密内容 ─> 变成 [密文📦]',
        '   │',
        '   ├── 4. 物理分离数据：',
        '   │      ├─▶ [密文📦] 隐藏在生成的分享链接中（留在本地，绝不上云）',
        '   │      └─▶ [AES密钥🔑] 发送至云端保险箱托管（设置倒计时/单次访问）',
        '   ▼',
        '[ 云端金库 (Cloudflare 边缘节点) ]',
        '   │  (安全声明：云端仅托管 AES 密钥，绝对不触碰密文。',
        '   │   时间到期或被读取一次后，KV 数据库立刻在物理层粉碎该密钥)',
        '   ▼',
        '[ 收信方 (本地浏览器) ]',
        '   │',
        '   ├── 1. 打开链接，浏览器在本地提取到 [密文📦]',
        '   ├── 2. 确认是人类操作后，向云端出示凭证索要 [AES密钥🔑]',
        '   ├── 3. 云端下发密钥，并立刻执行底层的物理销毁 💥',
        '   └── 4. 浏览器在本地使用拿到的 AES 密钥解开密文，展示内容'
    ].join('\n');

    var flowEn = [
        '[ Sender (local browser) ]',
        '   │',
        '   ├── 1. Enter plaintext',
        '   ├── 2. Invoke Web Crypto API locally to generate [AES-GCM 256-bit key 🔑]',
        '   ├── 3. Encrypt content locally with that key ─> [ciphertext 📦]',
        '   │',
        '   ├── 4. Physically separate the data:',
        '   │      ├─▶ [Ciphertext 📦] embedded in the share link (stays local, never uploaded)',
        '   │      └─▶ [AES key 🔑] sent to cloud vault (countdown / single-access policy)',
        '   ▼',
        '[ Cloud vault (Cloudflare edge) ]',
        '   │  (Security note: cloud stores only the AES key, never touches ciphertext.',
        '   │   After expiry or one read, KV physically destroys the key)',
        '   ▼',
        '[ Recipient (local browser) ]',
        '   │',
        '   ├── 1. Open link; browser extracts [ciphertext 📦] locally',
        '   ├── 2. After human confirmation, request [AES key 🔑] from cloud',
        '   ├── 3. Cloud returns key, then immediately destroys it 💥',
        '   └── 4. Browser decrypts locally and displays content'
    ].join('\n');

    var flowJa = [
        '[ 送信者 (ローカルブラウザ) ]',
        '   │',
        '   ├── 1. 平文を入力',
        '   ├── 2. Web Crypto API でローカルに [AES-GCM 256ビット鍵 🔑] を生成',
        '   ├── 3. その鍵でローカル高速暗号化 ─> [暗号文 📦]',
        '   │',
        '   ├── 4. データを物理分離：',
        '   │      ├─▶ [暗号文 📦] を共有リンクに埋め込み（ローカルに留まり、クラウドへ送信しない）',
        '   │      └─▶ [AES鍵 🔑] をクラウド金庫へ送信（カウントダウン / 一回限りアクセス）',
        '   ▼',
        '[ クラウド金庫 (Cloudflare エッジ) ]',
        '   │  (セキュリティ声明：クラウドは AES 鍵のみを保管し、暗号文には一切触れません。',
        '   │   期限切れまたは一度読まれた後、KV は物理層で鍵を即座に破棄)',
        '   ▼',
        '[ 受信者 (ローカルブラウザ) ]',
        '   │',
        '   ├── 1. リンクを開き、ブラウザがローカルで [暗号文 📦] を抽出',
        '   ├── 2. 人間操作を確認後、クラウドに証明を提示して [AES鍵 🔑] を要求',
        '   ├── 3. クラウドが鍵を返し、直ちに物理層で破棄 💥',
        '   └── 4. ブラウザがローカルで AES 鍵を使い復号し、内容を表示'
    ].join('\n');

    var extra = {
        index: {
            securityHelpAria: {
                zh: '为什么这套方案绝对安全？',
                en: 'Why is this approach absolutely secure?',
                ja: 'なぜこの方式は絶対に安全なのか？'
            },
            securityModalClose: {
                zh: '关闭',
                en: 'Close',
                ja: '閉じる'
            },
            securityModalBody: {
                zh: '<h3 id="securityModalTitle">为什么这套方案绝对安全？</h3>' +
                    '<p>核心在于<strong>密文与钥匙的物理隔离</strong>以及<strong>彻底的去身份化</strong>：</p>' +
                    '<ul>' +
                    '<li><strong>完全免注册的「去身份化」：</strong>在隐私保护领域，真正危险的往往不是信息本身，而是「信息 + 你的身份」。这款工具完全免注册，我们不需要你的手机号、邮箱或任何个人资料。退一万步讲，即便后台的访问统计记录下了一串数据请求，由于根本不知道你是谁，这些记录也是毫无意义的。这就好比泄露了一串没有姓名的身份证号，只要信息无法精准对应到具体的人，它本质上就是一串无效数据。</li>' +
                    '<li><strong>我们看不到你的内容：</strong>你的文字在本地就被加密成了乱码，并隐藏在链接的最末端。密文<strong>绝不上云</strong>，作为网站所有者，我们连你的数据包都碰不到。</li>' +
                    '<li><strong>钥匙自动焚毁：</strong>唯一能解密的钥匙被单独托管在云端。一旦对方看完（阅后即焚）或时间到期，钥匙就会被系统底层彻底、永久地粉碎。</li>' +
                    '<li><strong>绝对的零信任：</strong>密文在你的链接里，钥匙在云端计时销毁，两者「身首异处」。即使黑客攻破了我们的服务器，拿到的也只是即将销毁的钥匙，没有密文；即使有人在论坛爬到了链接，没有云端的钥匙也只是一串乱码。彻底杜绝了监守自盗和数据泄露。</li>' +
                    '</ul>' +
                    '<h4>🔒 限时密信工作流程图</h4>' +
                    '<pre class="security-flow-chart">' + flowZh + '</pre>' +
                    '<h4>提供这样的服务目的是什么？图什么？用爱发电能持久吗？</h4>' +
                    '<p>答案很简单：<strong>我们的网页托管在免费的 GitHub Pages 上，密钥托管脚本运行在免费的 Cloudflare Workers 上，我们的域名也是永久免费的。</strong> 作为一个对隐私保护有着极度执念的「隐私狂魔」，我们深知互联网大厂对隐私窥探的欲壑难填，更明白安全通信的价值。</p>' +
                    '<p>既然当前这套无服务器（Serverless）架构的运营成本几乎为零，我们当然可以，且乐意将这份纯粹的隐私保护服务一直持续下去~</p>' +
                    '<blockquote><strong>简而言之：用本地加密保护隐私，用物理销毁对抗画像。</strong></blockquote>',
                en: '<h3 id="securityModalTitle">Why is this approach absolutely secure?</h3>' +
                    '<p>It rests on <strong>physical separation of ciphertext and keys</strong> plus <strong>complete de-identification</strong>:</p>' +
                    '<ul>' +
                    '<li><strong>Registration-free de-identification:</strong> In privacy, the real risk is often not the data itself but <em>data + your identity</em>. This tool requires no sign-up — no phone, email, or profile. Even if access logs recorded requests, they cannot be tied to you, so they are meaningless — like a national ID number with no name attached.</li>' +
                    '<li><strong>We never see your content:</strong> Your text is encrypted locally into gibberish and hidden at the end of the link. Ciphertext is <strong>never uploaded</strong>; as site operators we cannot touch your payload.</li>' +
                    '<li><strong>Keys self-destruct:</strong> The only decryption key lives separately in the cloud. After one read (burn-after-reading) or when time expires, the key is permanently destroyed at the infrastructure layer.</li>' +
                    '<li><strong>Zero trust by design:</strong> Ciphertext stays in your link; the key is destroyed on a timer in the cloud — they never sit together. If our servers were breached, attackers would only get keys about to vanish, not ciphertext. If a forum crawler grabs your link, without the cloud key it is just noise — no insider abuse, no data leak.</li>' +
                    '</ul>' +
                    '<h4>🔒 Ephemeral Message workflow</h4>' +
                    '<pre class="security-flow-chart">' + flowEn + '</pre>' +
                    '<h4>Why offer this? What do we gain? Can a passion project last?</h4>' +
                    '<p>The answer is simple: <strong>pages are hosted on free GitHub Pages, key storage runs on free Cloudflare Workers, and the domain is permanently free.</strong> As privacy advocates, we know how hungry big tech is for surveillance — and how valuable secure communication is.</p>' +
                    '<p>With near-zero serverless running costs, we are happy to keep this pure privacy service going for as long as we can~</p>' +
                    '<blockquote><strong>In short: local encryption protects privacy; physical destruction fights profiling.</strong></blockquote>',
                ja: '<h3 id="securityModalTitle">なぜこの方式は絶対に安全なのか？</h3>' +
                    '<p>核心は<strong>暗号文と鍵の物理的分離</strong>と<strong>完全な非識別化</strong>にあります：</p>' +
                    '<ul>' +
                    '<li><strong>登録不要の「非識別化」：</strong>プライバシー保護では、危険なのは情報そのものより「情報＋あなたの身元」であることが多いです。本ツールは完全無登録で、電話番号・メール・個人情報は一切不要です。万が一アクセスログにリクエストが残っても、誰であるか分からなければ意味がありません — 名前のない身分証番号が漏れたようなものです。</li>' +
                    '<li><strong>私たちは内容を見られません：</strong>テキストはローカルで暗号文に変換され、リンク末尾に隠されます。暗号文は<strong>クラウドに送信されません</strong>。運営者としてデータパケットに触れることはできません。</li>' +
                    '<li><strong>鍵は自動消去：</strong>復号に必要な鍵だけがクラウドに別途保管されます。相手が読み終える（閲覧後即消去）か期限が切れると、インフラ層で永久に破棄されます。</li>' +
                    '<li><strong>ゼロトラスト設計：</strong>暗号文はリンク内、鍵はクラウドでタイマー消去 — 両者は常に分離。サーバーが侵害されても、消えゆく鍵しか得られず暗号文はありません。掲示板のクローラーがリンクを取得しても、クラウド鍵がなければただの文字列です。</li>' +
                    '</ul>' +
                    '<h4>🔒 期限付きメッセージのワークフロー</h4>' +
                    '<pre class="security-flow-chart">' + flowJa + '</pre>' +
                    '<h4>なぜこのサービスを？何が得られる？情熱だけで続くのか？</h4>' +
                    '<p>答えはシンプルです：<strong>ページは無料の GitHub Pages、鍵保管は無料の Cloudflare Workers、ドメインも永久無料です。</strong> プライバシーにこだわる私たちは、大手の監視欲と安全な通信の価値をよく知っています。</p>' +
                    '<p>サーバーレス構成の運用コストがほぼゼロなので、この純粋なプライバシー保護サービスを続けていきたいと考えています~</p>' +
                    '<blockquote><strong>要するに：ローカル暗号化でプライバシーを守り、物理消去でプロファイリングに対抗する。</strong></blockquote>'
            }
        }
    };
    Object.keys(extra.index).forEach(function (k) {
        window.SiteI18nStrings.index[k] = extra.index[k];
    });
})();

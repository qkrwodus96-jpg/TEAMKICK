// 화면 글자 사전 6/6 — 1.19~1.38 새 문구(용병 가능·관심 구장·차단·신고·풋살·경기 뒤 기록·팀 랭킹·케미·라인업 포스터·설치/알림 안내·매칭 대화)
const DICT=`축구·풋살	Soccer · Futsal	サッカー・フットサル	足球·五人制	Bóng đá · Futsal
축구	Soccer	サッカー	足球	Bóng đá
풋살	Futsal	フットサル	五人制	Futsal
내 용병 가능 등록	My guest availability	助っ人可能の登録	我的外援登记	Đăng ký đá khách của tôi
등록	Add	登録	登记	Thêm
뛸 수 있는 날·시간대·지역을 올리면 팀 주장·운영진이 보고 용병으로 초대할 수 있어요. 맞는 용병 모집이 열려도 알려 드려요. 날짜가 지나면 지워져요.	Post the days, times and areas you can play, and team captains and staff can invite you as a guest. We'll also let you know when a matching call opens. Entries are removed after the date passes.	プレーできる日・時間帯・地域を登録すると、チームの主将・運営陣が助っ人として招待できます。条件に合う募集が開いたときもお知らせします。日付が過ぎると削除されます。	登记可以踢球的日期、时段和地区后，球队队长和管理员可以邀请你当外援。有合适的外援招募时也会通知你。日期过后会自动删除。	Đăng ngày, khung giờ và khu vực bạn có thể đá, đội trưởng và ban điều hành có thể mời bạn làm khách. Khi có tin tuyển phù hợp, chúng tôi cũng sẽ báo. Hết ngày sẽ tự xóa.
아직 없어요.	Nothing yet.	まだありません。	还没有。	Chưa có.
· 초대	· invited	· 招待	· 邀请	· đã mời
이 등록 지우기	Delete this entry	この登録を削除	删除这条登记	Xóa đăng ký này
용병 가능 선수	Available guests	助っ人可能な選手	可当外援的球员	Cầu thủ có thể đá khách
팀 주장·운영진에게만 보여요. 용병이 필요하면 운영진에게 알려 주세요.	Only team captains and staff can see this. Tell your staff if you need a guest.	チームの主将・運営陣にだけ表示されます。助っ人が必要なら運営陣に伝えてください。	仅球队队长和管理员可见。需要外援请告诉管理员。	Chỉ đội trưởng và ban điều hành thấy. Cần người đá khách thì báo ban điều hành.
조건에 맞는 선수가 없어요.	No players match.	条件に合う選手がいません。	没有符合条件的球员。	Không có cầu thủ phù hợp.
지금 올라온 선수가 없어요.	No players posted right now.	今は登録された選手がいません。	目前没有登记的球员。	Hiện chưa có cầu thủ nào đăng.
포지션 미입력	Position not set	ポジション未入力	未填写位置	Chưa nhập vị trí
팀킥 기록	TeamKick stats	チームキック記録	TeamKick记录	Thành tích TeamKick
초대	Invite	招待	邀请	Mời
지역을 하나 이상 골라주세요.	Pick at least one area.	地域を1つ以上選んでください。	请至少选择一个地区。	Hãy chọn ít nhất một khu vực.
시간대 (여러 개 가능)	Time slots (multiple OK)	時間帯（複数可）	时段（可多选）	Khung giờ (chọn nhiều)
지역 (1~3곳)	Areas (1–3)	地域（1〜3か所）	地区（1~3个）	Khu vực (1–3)
종목	Sport	種目	项目	Môn
한마디 (선택, 100자)	Note (optional, 100 chars)	ひとこと（任意、100字）	留言（选填，100字）	Ghi chú (tùy chọn, 100 ký tự)
예: 미드필더 선호, 풀타임 가능	e.g. Prefer midfield, can play full time	例: MF希望、フル出場可	例：偏好中场，可踢全场	VD: Thích đá tiền vệ, đá trọn trận được
팀 주장·운영진에게 이름·포지션·주발·팀킥 기록(경기·골·도움)과 위 내용이 보여요. 연락처·키·몸무게는 보이지 않아요.	Captains and staff see your name, position, strong foot, TeamKick stats (matches, goals, assists) and the details above. Contact info, height and weight stay hidden.	主将・運営陣には名前・ポジション・利き足・チームキック記録（試合・ゴール・アシスト）と上の内容が表示されます。連絡先・身長・体重は表示されません。	队长和管理员会看到姓名、位置、惯用脚、TeamKick记录（比赛·进球·助攻）及以上内容。联系方式、身高、体重不会显示。	Đội trưởng và ban điều hành thấy tên, vị trí, chân thuận, thành tích TeamKick (trận, bàn, kiến tạo) và nội dung trên. Liên lạc, chiều cao, cân nặng không hiển thị.
올리기	Post	登録する	发布	Đăng
다가오는 경기가 없어요. 경기를 만들고 경기 상세에서	No upcoming matches. Create a match, then in match details open	予定の試合がありません。試合を作成し、試合詳細で	没有即将进行的比赛。先创建比赛，在比赛详情中开启	Chưa có trận sắp tới. Hãy tạo trận, rồi trong chi tiết trận mở
을 연 뒤 초대해 주세요.	before inviting.	を開いてから招待してください。	后再邀请。	rồi mời.
· 선수가 올린 시간과 맞아요	· matches the player's time	· 選手の登録時間と合います	· 与球员登记时间相符	· khớp giờ cầu thủ đăng
· 용병 모집을 먼저 열어 주세요	· open a guest call first	· 先に助っ人募集を開いてください	· 请先开启外援招募	· hãy mở tuyển khách trước
초대하면 선수에게 알림이 가고, 선수가 용병 탭에서 신청하면	The player gets a notification. When they apply from the Guests tab, you can approve them in	招待すると選手に通知が届き、選手が助っ人タブで申請すると	邀请后球员会收到通知，球员在外援页申请后，你可以在	Cầu thủ sẽ nhận thông báo. Khi họ đăng ký ở tab Khách, bạn duyệt trong
에서 승인할 수 있어요. 같은 경기로는 한 번만 초대돼요.	. Each match can only be invited once.	で承認できます。同じ試合への招待は1回だけです。	中批准。同一场比赛只能邀请一次。	. Mỗi trận chỉ mời được một lần.
초대 보내기	Send invite	招待を送る	发送邀请	Gửi lời mời
차단하지 못했어요.	Couldn't block.	ブロックできませんでした。	无法屏蔽。	Không chặn được.
수락	Accept	承諾	接受	Chấp nhận
차단한 사용자의 메시지예요	Message from a blocked user	ブロックしたユーザーのメッセージです	来自已屏蔽用户的消息	Tin nhắn từ người đã chặn
차단할까요?	Block?	ブロックしますか?	要屏蔽吗?	Chặn?
차단	Block	ブロック	屏蔽	Chặn
마이 케미	My chemistry	マイケミ	我的默契	Ăn ý của tôi
· 풋살	· Futsal	· フットサル	· 五人制	· Futsal
모든 팀 합산	All teams combined	全チーム合算	所有球队合计	Gộp mọi đội
내 골을 가장 많이 도운 선수	Assisted my goals the most	私のゴールを最も多くアシストした選手	为我助攻最多的球员	Kiến tạo cho tôi nhiều nhất
골 기록에서 골마다 도움 선수를 이으면 보여요.	Shows once goals are linked to an assist in the goal log.	ゴール記録で各ゴールにアシスト選手をつなぐと表示されます。	在进球记录中为每个进球关联助攻球员后显示。	Hiện khi mỗi bàn được gắn người kiến tạo trong nhật ký bàn thắng.
내가 가장 많이 도운 선수	Player I assisted the most	私が最も多くアシストした選手	我助攻最多的球员	Người tôi kiến tạo nhiều nhất
내가 도운 골이 골 기록에 이어지면 보여요.	Shows once my assists are linked in the goal log.	私のアシストがゴール記録につながると表示されます。	我的助攻关联到进球记录后显示。	Hiện khi kiến tạo của tôi được gắn trong nhật ký bàn thắng.
같이 뛰면 가장 잘 이기는 선수	Best win rate together	一緒に出ると最も勝つ選手	一起上场胜率最高的球员	Đá cùng thắng nhiều nhất
같이 뛰면 가장 많이 진 선수	Most losses together	一緒に出ると最も負けた選手	一起上场输得最多的球员	Đá cùng thua nhiều nhất
내 계정으로 뛴 모든 팀 기록을 합쳐 나에게만 보여요. 같이 뛴 승률은 둘 다 출석이 확정되고 점수가 확정된 경기만(자체전은 같은 편일 때만) 세요.	Combines every team you've played for under your account, visible only to you. Win rates together count only matches where both of you had confirmed attendance and the score was confirmed (in-team games only when on the same side).	自分のアカウントでプレーした全チームの記録を合算し、自分だけに表示します。一緒の勝率は、2人とも出席確定・スコア確定の試合のみ（紅白戦は同じチームのときのみ）数えます。	合并你账号下所有球队的记录，仅自己可见。共同胜率只统计两人出勤都已确认且比分已确认的比赛（队内赛仅限同一边）。	Gộp thành tích mọi đội bạn đã đá bằng tài khoản này, chỉ bạn thấy. Tỉ lệ thắng khi đá cùng chỉ tính trận cả hai đã xác nhận có mặt và tỉ số đã xác nhận (đá nội bộ chỉ khi cùng phe).
계좌번호를 복사했어요. 은행 앱에 붙여 넣으세요.	Account number copied. Paste it in your bank app.	口座番号をコピーしました。銀行アプリに貼り付けてください。	已复制账号。请粘贴到银行App。	Đã sao chép số tài khoản. Dán vào ứng dụng ngân hàng.
복사하지 못했어요. 길게 눌러 직접 복사해 주세요.	Couldn't copy. Long-press to copy it yourself.	コピーできませんでした。長押ししてコピーしてください。	复制失败。请长按手动复制。	Không sao chép được. Nhấn giữ để tự sao chép.
금액 미정	Amount not set	金額未定	金额未定	Chưa định số tiền
매달 회비(원)	Monthly fee (KRW)	毎月の会費（ウォン）	每月会费（韩元）	Phí hằng tháng (KRW)
안내(납부일 등)	Note (due date, etc.)	案内（納付日など）	说明（缴费日等）	Ghi chú (hạn nộp…)
예: 매달 5일까지	e.g. By the 5th of each month	例: 毎月5日まで	例：每月5日前	VD: Trước ngày 5 hằng tháng
은행	Bank	銀行	银行	Ngân hàng
예금주	Account holder	口座名義	开户人	Chủ tài khoản
계좌번호	Account number	口座番号	账号	Số tài khoản
숫자만 (하이픈 가능)	Digits only (hyphens OK)	数字のみ（ハイフン可）	仅数字（可含连字符）	Chỉ số (được dùng gạch nối)
토스 아이디	Toss ID	Toss ID	Toss ID	ID Toss
(선택 — toss.me/아이디)	(optional — toss.me/ID)	（任意 — toss.me/ID）	（选填 — toss.me/ID）	(tùy chọn — toss.me/ID)
카카오페이 송금 링크	KakaoPay transfer link	カカオペイ送金リンク	KakaoPay转账链接	Liên kết chuyển KakaoPay
(선택 — 카카오페이 앱 → 송금 → 송금 링크)	(optional — KakaoPay app → Send → Transfer link)	（任意 — カカオペイアプリ → 送金 → 送金リンク）	（选填 — KakaoPay App → 转账 → 转账链接）	(tùy chọn — App KakaoPay → Chuyển → Liên kết chuyển)
계좌·아이디는 우리 팀원에게만 보여요. 팀킥이 돈을 받거나 옮기지 않아요.	Account and IDs are visible only to your teammates. TeamKick never receives or moves money.	口座・IDはチームメンバーにだけ表示されます。チームキックがお金を受け取ったり移動したりはしません。	账号和ID仅本队成员可见。TeamKick不收取或转移资金。	Tài khoản và ID chỉ đồng đội thấy. TeamKick không nhận hay chuyển tiền.
계좌	Account	口座	账户	Tài khoản
냈다고 알림	Marked as paid	支払った通知	已付款通知	Đã báo đã nộp
오늘 알렸어요	Reminded today	今日通知しました	今天已提醒	Đã nhắc hôm nay
회비 알림 보내기	Send fee reminder	会費の通知を送る	发送会费提醒	Gửi nhắc phí
보냄	Sent	送信済み	已发送	Đã gửi
이 달 회비 납부가 확인됐어요.	This month's fee is confirmed as paid.	今月の会費の納付が確認されました。	本月会费已确认缴纳。	Đã xác nhận nộp phí tháng này.
냈다고 알렸어요. 운영진이 확인하면 납부로 바뀌어요.	You marked it as paid. It changes to paid once staff confirm.	支払ったと通知しました。運営陣が確認すると納付済みになります。	已通知已付款。管理员确认后会变为已缴。	Đã báo đã nộp. Ban điều hành xác nhận sẽ chuyển thành đã nộp.
아직 납부 기록이 없어요.	No payment record yet.	まだ納付記録がありません。	还没有缴费记录。	Chưa có ghi nhận nộp phí.
다시 알리기	Remind again	もう一度通知	再次提醒	Nhắc lại
회비는 기록만 해요. 돈은 팀 계좌 등으로 직접 주고받고, 팀킥에서 결제하거나 보관하지 않아요.	Fees are records only. Money is exchanged directly (e.g. to the team account); TeamKick doesn't process or hold payments.	会費は記録だけです。お金はチーム口座などで直接やり取りし、チームキックでは決済・保管しません。	会费只做记录。款项直接转到球队账户等，TeamKick不收付也不保管。	Phí chỉ được ghi nhận. Tiền chuyển trực tiếp (vd. tài khoản đội), TeamKick không thanh toán hay giữ tiền.
누가 냈는지는 운영진에게만 보여요.	Only staff can see who paid.	誰が払ったかは運営陣にだけ表示されます。	谁已缴费仅管理员可见。	Chỉ ban điều hành thấy ai đã nộp.
관심 구장에서 뺐어요.	Removed from favorite venues.	お気に入り会場から外しました。	已从关注球场移除。	Đã bỏ khỏi sân yêu thích.
관심 구장에 넣었어요. 이 구장에 모집이 열리면 알려드려요.	Added to favorite venues. We'll notify you when a call opens here.	お気に入り会場に追加しました。この会場で募集が開くとお知らせします。	已加入关注球场。这里有招募时会通知你。	Đã thêm vào sân yêu thích. Có tin tuyển ở sân này sẽ báo bạn.
관심 구장	Favorite venues	お気に入り会場	关注球场	Sân yêu thích
관심 구장 추가	Add favorite venue	お気に入り会場を追加	添加关注球场	Thêm sân yêu thích
이 구장에 상대팀 모집이나 용병 모집이 올라오면 알림을 보내요. 우리 팀이 올린 모집은 빼요.	We'll notify you when an opponent or guest call is posted at this venue. Your own team's posts are excluded.	この会場に対戦相手・助っ人の募集が出たら通知します。自チームの募集は除きます。	此球场有约战或外援招募时会通知你。不含本队发布的招募。	Khi sân này có tin tìm đối hoặc tuyển khách, chúng tôi sẽ báo. Không tính tin của đội bạn.
아직 없어요. 경기 상세의	None yet. Add one with	まだありません。試合詳細の	还没有。可用比赛详情中的	Chưa có. Thêm bằng
로 넣을 수 있어요.	.	で追加できます。	添加。	.
알림 종목	Notify for	通知する種目	通知项目	Báo cho môn
둘 다	Both	両方	两者	Cả hai
골 시간	Goal times	ゴール時間	进球时间	Thời điểm ghi bàn
경기 영상 보기	Watch match video	試合動画を見る	观看比赛视频	Xem video trận
영상 링크 바꾸기	Change video link	動画リンクを変更	更改视频链接	Đổi liên kết video
유튜브 영상 링크 넣기	Add YouTube link	YouTubeリンクを追加	添加YouTube链接	Thêm liên kết YouTube
FULL TIME 이미지	FULL TIME image	FULL TIME画像	FULL TIME图片	Ảnh FULL TIME
https://youtu.be/… (비우면 지워요)	https://youtu.be/… (leave empty to remove)	https://youtu.be/…（空にすると削除）	https://youtu.be/…（留空即删除）	https://youtu.be/… (để trống để xóa)
유튜브 영상 주소	YouTube video URL	YouTube動画のURL	YouTube视频地址	Địa chỉ video YouTube
크롬 등	Chrome, etc.	Chromeなど	Chrome等	Chrome, v.v.
화면 아래	At the bottom, tap	画面下の	屏幕下方	Ở cuối màn hình, nhấn
누르기	tap	をタップ	点按	nhấn
고르기	choose	を選ぶ	选择	chọn
설치	Install	インストール	安装	Cài đặt
(또는 추가) 누르기	(or Add)	（または追加）をタップ	（或添加）	(hoặc Thêm)
전반	1st half	前半	上半场	Hiệp 1
후반	2nd half	後半	下半场	Hiệp 2
구간	period	区間	时段	hiệp
라인업을 저장했어요.	Lineup saved.	ラインナップを保存しました。	阵容已保存。	Đã lưu đội hình.
아직 참여한 사람이 없어요. 참여 투표가 모이면 다시 눌러 주세요.	No one has joined yet. Try again once votes come in.	まだ参加者がいません。参加投票が集まったらもう一度押してください。	还没有人参加。投票汇集后再点一次。	Chưa có ai tham gia. Khi có phiếu tham gia hãy nhấn lại.
전·후반	both halves	前後半	上下半场	hai hiệp
라인업이 없어요.	No lineup.	ラインナップがありません。	没有阵容。	Chưa có đội hình.
나눠 뛰기	Split into	分けて出場	分段	Chia lượt
저장 안 됨	Not saved	未保存	未保存	Chưa lưu
라인업으로 포스터 만들기	lineup → make poster	ラインナップでポスター作成	阵容生成海报	đội hình → tạo poster
자동 분배	auto split	自動配分	自动分配	chia tự động
전체 저장	Save all	すべて保存	全部保存	Lưu tất cả
횟수	count	回数	次数	số lần
자리	position	ポジション	位置	vị trí
출전	Played	出場	出场	Ra sân
이 경기 용병 최소 출전 보장:	Guaranteed minimum play for guests:	この試合の助っ人最低出場保証:	本场外援最少出场保证：	Đảm bảo thời gian tối thiểu cho khách:
축구 소식	Football news	サッカーニュース	足球资讯	Tin bóng đá
샘플에서는 기사를 불러오지 않아요.	Articles aren't loaded in the sample.	サンプルでは記事を読み込みません。	示例中不加载文章。	Bản mẫu không tải bài viết.
네이버가 응답하지 않아	Naver didn't respond, so	ネイバーが応答しないため	Naver未响应，	Naver không phản hồi nên
모은 소식을 보여드려요.	showing news collected earlier.	集めたニュースを表示します。	显示已收集的资讯。	hiển thị tin đã thu thập.
— 더 고르려면 하나를 빼주세요.	— remove one to pick more.	— さらに選ぶには1つ外してください。	— 想再选请先移除一个。	— bỏ một mục để chọn thêm.
엣지	Edge	Edge	Edge	Edge
서버가 이 기기로 보냄	Server sent to this device	サーバーがこの端末に送信	服务器已发送到此设备	Máy chủ đã gửi tới thiết bị này
☰ 메뉴 → 설정 → 사이트 및 다운로드 → 알림	☰ Menu → Settings → Sites and downloads → Notifications	☰ メニュー → 設定 → サイトとダウンロード → 通知	☰ 菜单 → 设置 → 网站和下载 → 通知	☰ Menu → Cài đặt → Trang web và tải xuống → Thông báo
에서	,	で	中，	,
‘웹사이트 알림 자동 차단’ 을 끄고	turn off “Auto-block website notifications”	「ウェブサイト通知の自動ブロック」をオフにし	关闭“自动阻止网站通知”	tắt “Tự động chặn thông báo trang web”
, 아래 목록에	, and check that in the list below	、下の一覧で	，并确认下方列表中	, rồi kiểm tra trong danh sách bên dưới
teamkick.co.kr 이 켜져	teamkick.co.kr is on	teamkick.co.kr がオンに	teamkick.co.kr 已开启	teamkick.co.kr đang bật
⋮ 메뉴 → 설정 → 사이트 설정 → 알림	⋮ Menu → Settings → Site settings → Notifications	⋮ メニュー → 設定 → サイトの設定 → 通知	⋮ 菜单 → 设置 → 网站设置 → 通知	⋮ Menu → Cài đặt → Cài đặt trang web → Thông báo
크롬을 다시 열 때 알림이 한꺼번에	notifications arrive all at once when you reopen Chrome	Chromeを再び開いたときに通知がまとめて	重新打开Chrome时通知会一起	thông báo đến dồn khi mở lại Chrome
아이폰은	On iPhone,	iPhoneは	iPhone需要	Trên iPhone,
한 뒤,	first, then	したあと、	之后，	rồi
그 아이콘으로 연 팀킥	TeamKick opened from that icon	そのアイコンから開いたチームキック	从该图标打开的TeamKick	TeamKick mở từ biểu tượng đó
브라우저 설정의	In your browser settings under	ブラウザ設定の	请在浏览器设置的	Trong cài đặt trình duyệt, mục
사이트 권한 → 알림	Site permissions → Notifications	サイトの権限 → 通知	网站权限 → 通知	Quyền trang web → Thông báo
에서 teamkick.co.kr 을 허용해주세요.	, allow teamkick.co.kr.	で teamkick.co.kr を許可してください。	中允许 teamkick.co.kr。	, hãy cho phép teamkick.co.kr.
안드로이드 폰 자체 설정도 봐 주세요:	Also check your Android phone's settings:	Android端末本体の設定も確認してください:	也请检查安卓手机本身的设置：	Hãy kiểm tra cả cài đặt điện thoại Android:
설정 → 애플리케이션 →	Settings → Apps →	設定 → アプリ →	设置 → 应用 →	Cài đặt → Ứng dụng →
→ 알림	→ Notifications	→ 通知	→ 通知	→ Thông báo
이 켜져 있어야 해요. 알림이 오면 폰 맨 위에 작은	must be on. When a notification arrives, a small	がオンである必要があります。通知が来るとスマホの一番上に小さな	必须开启。收到通知时手机顶部会出现小小的	phải bật. Khi có thông báo, trên cùng điện thoại sẽ hiện biểu tượng nhỏ
아이콘이 떠요.	icon appears at the top of your phone.	アイコンが表示されます。	图标。	.
삼성 인터넷은 켠 뒤	In Samsung Internet, after turning it on, go to	Samsungインターネットはオンにした後	三星浏览器开启后，请在	Với Samsung Internet, sau khi bật hãy vào
설정 → 사이트 및 다운로드 → 알림	Settings → Sites and downloads → Notifications	設定 → サイトとダウンロード → 通知	设置 → 网站和下载 → 通知	Cài đặt → Trang web và tải xuống → Thông báo
‘웹사이트 알림 자동 차단’	“Auto-block website notifications”	「ウェブサイト通知の自動ブロック」	“自动阻止网站通知”	“Tự động chặn thông báo trang web”
을 꺼 두세요.	and turn it off.	をオフにしてください。	关闭。	và tắt nó.
이 기기의 알림 등록이 서버 키와 달라서 방금 다시 등록했어요. 이제 시험 알림을 눌러보세요.	This device's notification registration didn't match the server key, so it was just re-registered. Try a test notification now.	この端末の通知登録がサーバーキーと違っていたので、今再登録しました。テスト通知を押してみてください。	此设备的通知注册与服务器密钥不符，已重新注册。现在试试测试通知。	Đăng ký thông báo của thiết bị khác khóa máy chủ nên vừa đăng ký lại. Giờ hãy thử thông báo kiểm tra.
상태예요	status	状態です	状态	trạng thái
평소 알림은	Regular notifications	普段の通知は	平时的通知	Thông báo thường
에서만 알림과 아이콘 숫자가 나와요. 사파리 탭에서는 오지 않아요.	— only there do notifications and the icon badge appear. They don't come to a Safari tab.	でのみ通知とアイコンの数字が出ます。Safariのタブには届きません。	才会显示通知和图标数字。Safari标签页收不到。	— chỉ ở đó mới có thông báo và số trên biểu tượng. Tab Safari không nhận.
공격포인트	Goal contributions	攻撃ポイント	进攻贡献	Điểm tấn công
공P	G+A	攻P	G+A	B+KT
순으로 보기	sort	順に表示	排序	sắp xếp
과거	Past	過去	过去	Cũ
자체	In-team	紅白戦	队内	Nội bộ
주발	Strong foot	利き足	惯用脚	Chân thuận
생일	Birthday	誕生日	生日	Sinh nhật
인스타그램	Instagram	Instagram	Instagram	Instagram
프로필을 아직 적지 않았어요.	No profile yet.	プロフィールはまだありません。	还没有填写资料。	Chưa có hồ sơ.
위 숫자는 기록 탭에서 고른 기간 기준이에요.	Numbers above use the period picked in the Stats tab.	上の数字は記録タブで選んだ期間が基準です。	以上数字以记录页选择的期间为准。	Số trên tính theo khoảng thời gian chọn ở tab Thống kê.
아직 끝난 경기 기록이 없어요.	No finished match records yet.	まだ終わった試合の記録がありません。	还没有已结束比赛的记录。	Chưa có thành tích trận đã đấu.
선발 명단	Starting lineup	スタメン	首发名单	Đội hình xuất phát
저장하지 못했어요.	Couldn't save.	保存できませんでした。	保存失败。	Không lưu được.
팀 기본 색으로 저장했어요. 팀원도 이 색으로 만들어요.	Saved as team default colors. Teammates will use them too.	チームの基本色として保存しました。メンバーもこの色で作ります。	已保存为球队默认颜色。队友也会用此颜色。	Đã lưu làm màu mặc định của đội. Đồng đội cũng dùng màu này.
직접 고르기	Pick your own	自分で選ぶ	自选	Tự chọn
라인업 탭에 저장한 자리·선수로 그려요.	Drawn from the positions and players saved in the Lineup tab.	ラインナップタブに保存したポジション・選手で描きます。	按阵容页保存的位置和球员绘制。	Vẽ theo vị trí và cầu thủ đã lưu ở tab Đội hình.
포메이션	Formation	フォーメーション	阵型	Sơ đồ
은 라인업 탭에 정해 둔 자리 그대로 그려요.	is drawn exactly as set in the Lineup tab.	はラインナップタブで決めた位置どおりに描きます。	按阵容页设定的位置绘制。	được vẽ đúng như đã đặt ở tab Đội hình.
사진 속 사람만 남기고 배경을 지워요. 이 폰 안에서만 처리하고 사진을 어디로 보내지 않아요. 처음엔 몇 초 걸려요.	Removes the background and keeps only the person. Processed on this phone only; photos aren't sent anywhere. Takes a few seconds the first time.	写真の人物だけ残して背景を消します。このスマホ内だけで処理し、写真はどこにも送りません。初回は数秒かかります。	去掉背景只保留人物。仅在本机处理，不会上传照片。首次需要几秒。	Xóa nền, chỉ giữ người. Chỉ xử lý trên điện thoại này, không gửi ảnh đi đâu. Lần đầu mất vài giây.
사진을 자르지 않고 통째로 넣어요.	Uses the whole photo without cropping.	写真を切り抜かずにそのまま入れます。	不裁剪，直接放入整张照片。	Dùng nguyên ảnh, không cắt.
사진 대신 실루엣으로 그려요.	Draws a silhouette instead of a photo.	写真の代わりにシルエットで描きます。	用剪影代替照片。	Vẽ hình bóng thay cho ảnh.
★ 를 누른 선수 사진이 크게 들어가요(선발 명단·MATCHDAY).	The ★ player's photo is shown large (Starting lineup · MATCHDAY).	★を押した選手の写真が大きく入ります（スタメン・MATCHDAY）。	点★的球员照片会放大显示（首发名单·MATCHDAY）。	Ảnh cầu thủ được ★ sẽ hiện lớn (Đội hình xuất phát · MATCHDAY).
대표 선수로	as featured player	代表選手に	设为代表球员	làm cầu thủ nổi bật
사진 있음	has photo	写真あり	有照片	có ảnh
경기 정보(상대 엠블럼·이름·날짜·구장)와 참여 투표한 선수가 자동으로 들어가요.	Match info (opponent crest, name, date, venue) and players who voted to play are filled in automatically.	試合情報（相手エンブレム・名前・日付・会場）と参加投票した選手が自動で入ります。	比赛信息（对手队徽、名称、日期、球场）和投票参加的球员会自动填入。	Thông tin trận (logo, tên đối thủ, ngày, sân) và cầu thủ bình chọn tham gia được tự điền.
팀이 올린 로고·선수 사진과 이름·등번호로 팀킥이 직접 그린 이미지예요. 사진 속 사람에게 올려도 되는지 먼저 물어봐 주세요.	An image TeamKick draws from your team's logo, player photos, names and numbers. Please ask the people in the photos before posting.	チームが登録したロゴ・選手写真と名前・背番号でチームキックが描いた画像です。写真の人に投稿してよいか先に確認してください。	这是TeamKick用球队上传的队徽、球员照片、姓名和号码绘制的图片。发布前请先征得照片中人的同意。	Ảnh do TeamKick vẽ từ logo, ảnh cầu thủ, tên và số áo của đội. Hãy hỏi người trong ảnh trước khi đăng.
욕설·비하	Abuse · insults	暴言・誹謗	辱骂·贬低	Chửi bới · xúc phạm
노쇼·약속 불이행	No-show · broken promise	ノーショー・約束不履行	爽约·不守约	Bỏ trận · thất hứa
허위 모집·기록	Fake post · records	虚偽の募集・記録	虚假招募·记录	Tin tuyển · thành tích giả
사기·금전 요구	Fraud · money demands	詐欺・金銭要求	诈骗·索要钱财	Lừa đảo · đòi tiền
광고·도배	Ads · spam	広告・荒らし	广告·刷屏	Quảng cáo · spam
기타	Other	その他	其他	Khác
차단·신고	Block · Report	ブロック・通報	屏蔽·举报	Chặn · Báo cáo
샘플에서는 차단·신고를 할 수 없어요.	Blocking and reporting aren't available in the sample.	サンプルではブロック・通報はできません。	示例中无法屏蔽或举报。	Bản mẫu không thể chặn hay báo cáo.
처리 결과는 MY → 고객센터 → 내 신고 내역에서 볼 수 있어요.	See the outcome in MY → Help center → My reports.	処理結果は MY → カスタマーセンター → 自分の通報履歴 で確認できます。	处理结果可在 MY → 客服中心 → 我的举报 查看。	Xem kết quả tại MY → Trung tâm hỗ trợ → Báo cáo của tôi.
MY → 설정 → 차단 목록에서 언제든 바꿀 수 있어요.	You can change this anytime in MY → Settings → Blocked list.	MY → 設定 → ブロック一覧 でいつでも変更できます。	可随时在 MY → 设置 → 屏蔽列表 更改。	Có thể đổi bất cứ lúc nào ở MY → Cài đặt → Danh sách chặn.
차단한 사람이에요	You blocked this person	ブロックした人です	已屏蔽此人	Bạn đã chặn người này
이 사람 차단	Block this person	この人をブロック	屏蔽此人	Chặn người này
채팅에서 이 사람의 메시지가 접혀 보여요.	Their chat messages are collapsed.	チャットでこの人のメッセージが折りたたまれます。	聊天中此人的消息会被折叠。	Tin nhắn của họ trong chat sẽ bị thu gọn.
나에게(내가 주장·운영진인 팀에) 용병 신청·경기 대화를 보낼 수 없어요.	They can't send guest applications or match chats to you (or teams where you're captain/staff).	自分（自分が主将・運営陣のチーム）に助っ人申請・試合の会話を送れません。	对方无法向你（或你担任队长/管理员的球队）发送外援申请或比赛对话。	Họ không thể gửi đăng ký đá khách hay chat trận cho bạn (hoặc đội bạn làm đội trưởng/ban điều hành).
상대에게 차단했다고 알리지 않아요. 같은 팀이면 팀 활동(투표·기록)은 그대로예요.	They aren't told. If you're on the same team, team activity (votes, records) continues as usual.	相手にブロックしたことは知らせません。同じチームならチーム活動（投票・記録）はそのままです。	不会通知对方。如在同一球队，队内活动（投票、记录）照常。	Họ sẽ không được báo. Nếu cùng đội, hoạt động đội (bình chọn, thành tích) vẫn như cũ.
차단을 해제했어요.	Unblocked.	ブロックを解除しました。	已取消屏蔽。	Đã bỏ chặn.
차단 해제	Unblock	ブロック解除	取消屏蔽	Bỏ chặn
차단하기	Block	ブロックする	屏蔽	Chặn
차단한 팀이에요	You blocked this team	ブロックしたチームです	已屏蔽此球队	Bạn đã chặn đội này
이 팀 차단	Block this team	このチームをブロック	屏蔽此球队	Chặn đội này
이 팀의 매칭·용병 모집글과 보낸 매칭 신청이 내 화면에서 사라져요.	This team's match and guest posts, and match requests it sent, disappear from your screens.	このチームのマッチング・助っ人募集とマッチング申請が自分の画面から消えます。	该球队的约战、外援招募及发来的约战申请将从你的页面消失。	Tin tìm đối, tuyển khách và lời mời ghép trận của đội này sẽ biến khỏi màn hình bạn.
내가 주장·운영진인 팀의 경기에 이 팀이 매칭을 신청할 수 없어요.	They can't request matches with teams where you're captain/staff.	自分が主将・運営陣のチームの試合に、このチームはマッチング申請できません。	该球队无法向你担任队长/管理员的球队申请约战。	Đội này không thể xin ghép trận với đội bạn làm đội trưởng/ban điều hành.
상대 팀에 알리지 않아요.	The other team isn't told.	相手チームには知らせません。	不会通知对方球队。	Đội kia sẽ không được báo.
팀 차단을 해제했어요.	Team unblocked.	チームのブロックを解除しました。	已取消屏蔽球队。	Đã bỏ chặn đội.
팀 차단	Block team	チームをブロック	屏蔽球队	Chặn đội
신고했어요. 운영자가 확인한 뒤 결과를 알려드려요.	Reported. We'll let you know the result after review.	通報しました。運営者が確認後に結果をお知らせします。	已举报。运营者核实后会告知结果。	Đã báo cáo. Chúng tôi sẽ báo kết quả sau khi xem xét.
이 모집글 신고	Report this post	この募集を通報	举报此招募	Báo cáo tin này
이 팀 신고	Report this team	このチームを通報	举报此球队	Báo cáo đội này
이 사람 신고	Report this person	この人を通報	举报此人	Báo cáo người này
신고 사유	Reason	通報理由	举报原因	Lý do
자세한 내용 (선택)	Details (optional)	詳しい内容（任意）	详细内容（选填）	Chi tiết (tùy chọn)
언제, 어떤 일이 있었는지 적어주시면 확인이 빨라요. 다른 사람의 연락처·계좌번호는 적지 말아주세요.	Telling us when and what happened speeds up review. Please don't include others' contact info or account numbers.	いつ、何があったか書いていただくと確認が早くなります。他人の連絡先・口座番号は書かないでください。	写明时间和经过可加快处理。请勿填写他人的联系方式或账号。	Ghi rõ khi nào, chuyện gì giúp xử lý nhanh hơn. Đừng ghi liên lạc hay số tài khoản của người khác.
이 사람도 차단하기	Also block this person	この人もブロックする	同时屏蔽此人	Chặn luôn người này
이 팀도 차단하기	Also block this team	このチームもブロックする	同时屏蔽此球队	Chặn luôn đội này
신고 대상에게는 누가 신고했는지 알리지 않아요. 운영자가 내용을 확인해 경고·이용 제한 등을 정해요. 허위 신고는 이용이 제한될 수 있어요.	The reported party isn't told who reported. We review and decide on warnings or restrictions. False reports may lead to restrictions.	通報された側には誰が通報したか知らせません。運営者が内容を確認し、警告・利用制限などを決めます。虚偽の通報は利用が制限されることがあります。	不会告知被举报方是谁举报的。运营者核实后决定警告或限制使用。虚假举报可能被限制使用。	Người bị báo cáo không biết ai báo. Chúng tôi xem xét và quyết định cảnh cáo hay hạn chế. Báo cáo sai có thể bị hạn chế.
신고하기	Report	通報する	举报	Báo cáo
해제	Unblock	解除	解除	Bỏ
사람	People	人	人	Người
차단한 사람이 없어요.	No blocked people.	ブロックした人はいません。	没有屏蔽的人。	Chưa chặn ai.
차단한 팀이 없어요.	No blocked teams.	ブロックしたチームはありません。	没有屏蔽的球队。	Chưa chặn đội nào.
차단은 채팅 말풍선, 선수 기록 창, 팀 프로필, 용병 신청, 랭킹 카드에서 할 수 있어요.	You can block from chat bubbles, player record sheets, team profiles, guest applications and ranking cards.	ブロックはチャットの吹き出し、選手記録、チームプロフィール、助っ人申請、ランキングカードからできます。	可在聊天气泡、球员记录、球队资料、外援申请和排行卡片中屏蔽。	Có thể chặn từ bong bóng chat, bảng thành tích cầu thủ, hồ sơ đội, đơn đá khách và thẻ xếp hạng.
모집글	Posts	募集	招募	Tin tuyển
기간 없음	No end date	期間なし	无期限	Không thời hạn
운영자에게 직접 물어봐요	Ask the operator directly	運営者に直接聞く	直接询问运营者	Hỏi trực tiếp người vận hành
업데이트와 서비스 소식	Updates and service news	アップデートとサービスのお知らせ	更新和服务消息	Cập nhật và tin dịch vụ
차단 목록	Blocked list	ブロック一覧	屏蔽列表	Danh sách chặn
차단한 사람·팀 보기와 해제	View and unblock people and teams	ブロックした人・チームの確認と解除	查看并解除屏蔽的人和球队	Xem và bỏ chặn người, đội
약관·개인정보처리방침	Terms · Privacy policy	利用規約・個人情報処理方針	条款·隐私政策	Điều khoản · Chính sách quyền riêng tư
초안 · 전문가 검토 전	Draft · not yet reviewed by experts	草案 · 専門家の確認前	草案 · 尚未经专家审核	Bản nháp · chưa qua chuyên gia
신고·차단은 이렇게 해요	How to report and block	通報・ブロックの方法	如何举报和屏蔽	Cách báo cáo và chặn
채팅: 상대 말풍선을 누르면 →	Chat: tap their message bubble →	チャット: 相手の吹き出しを押す →	聊天：点对方的气泡 →	Chat: nhấn bong bóng tin của họ →
사람: 선수 기록 창·용병 신청·랭킹 카드의	People: in player records, guest applications or ranking cards, tap	人: 選手記録・助っ人申請・ランキングカードの	人：在球员记录、外援申请、排行卡片中点	Người: trong bảng thành tích, đơn đá khách, thẻ xếp hạng, nhấn
팀·모집글: 팀 프로필 또는 신청 창의	Teams and posts: in a team profile or application, tap	チーム・募集: チームプロフィールまたは申請画面の	球队·招募：在球队资料或申请窗口点	Đội · tin tuyển: trong hồ sơ đội hoặc cửa sổ đăng ký, nhấn
급하게 위험한 상황이면 먼저 112(경찰)에 신고해주세요.	If you're in urgent danger, call 112 (police) first.	緊急で危険な状況なら、まず112（警察）に通報してください。	如遇紧急危险，请先拨打112（警察）。	Nếu nguy hiểm khẩn cấp, hãy gọi 112 (cảnh sát) trước.
내 신고 내역	My reports	自分の通報履歴	我的举报	Báo cáo của tôi
확인 중	Under review	確認中	审核中	Đang xem xét
운영자 처리 결과	Operator's decision	運営者の処理結果	运营者处理结果	Kết quả xử lý
신고한 내역이 없어요.	No reports yet.	通報履歴はありません。	没有举报记录。	Chưa có báo cáo.
이메일 문의:	Email:	メールでのお問い合わせ:	邮件咨询：	Email:
동의하고 시작하기	Agree and start	同意して始める	同意并开始	Đồng ý và bắt đầu
팀에서 초대했어요	You've been invited by a team	チームから招待されました	球队邀请了你	Bạn được đội mời
이미 이메일로 가입하셨다면	If you already signed up with email	すでにメールで登録済みなら	如果已用邮箱注册	Nếu bạn đã đăng ký bằng email
사진을 불러오지 못했어요.	Couldn't load the photo.	写真を読み込めませんでした。	无法加载照片。	Không tải được ảnh.
배경을 지우지 못했어요.	Couldn't remove the background.	背景を消せませんでした。	无法去除背景。	Không xóa được nền.
전체	All	すべて	全部	Tất cả
종목별 합계	Totals by sport	種目別合計	按项目合计	Tổng theo môn
참가비 무료	Free entry	参加費無料	免参赛费	Miễn phí
노쇼 보증금	No-show deposit	ノーショー保証金	爽约押金	Tiền cọc bỏ trận
최소 출전	Min. playing time	最低出場	最少出场	Thời gian tối thiểu
★ 관심 구장만	★ Favorite venues only	★ お気に入り会場のみ	★ 仅关注球场	★ Chỉ sân yêu thích
새벽	Dawn	早朝	凌晨	Rạng sáng
모집글 보기 방식	View posts by	募集の表示方法	招募查看方式	Cách xem tin tuyển
시간대	Time slot	時間帯	时段	Khung giờ
이 시간대엔 등록된 모집이 없어요.	No posts in this time slot.	この時間帯の募集はありません。	该时段没有招募。	Khung giờ này chưa có tin tuyển.
용병 보기	View guests	助っ人を見る	查看外援	Xem khách
고객센터	Help center	カスタマーセンター	客服中心	Trung tâm hỗ trợ
문의·공지·차단 목록·신고 내역을 한곳에서 봐요.	Inquiries, notices, blocked list and reports in one place.	お問い合わせ・お知らせ・ブロック一覧・通報履歴をまとめて確認。	咨询、公告、屏蔽列表和举报记录集中查看。	Hỏi đáp, thông báo, danh sách chặn và báo cáo ở một nơi.
열기	Open	開く	打开	Mở
경기 안내	Match info	試合案内	比赛信息	Thông tin trận
용병 모집 안내	Guest call	助っ人募集の案内	外援招募信息	Tin tuyển khách
용병 가능 등록	Guest availability	助っ人可能の登録	外援登记	Đăng ký đá khách
용병 초대	Invite guest	助っ人招待	邀请外援	Mời đá khách
경기 점수 입력	Enter match score	試合スコア入力	输入比赛比分	Nhập tỉ số
알림으로 받은 용병 모집이에요. 확인하고 바로 신청할 수 있어요.	A guest call from your notification. Check it and apply right away.	通知で届いた助っ人募集です。確認してすぐ申請できます。	这是通知中的外援招募，确认后可直接申请。	Tin tuyển khách từ thông báo. Xem và đăng ký ngay.
이 구장에 다른 팀 모집이 열리면 알려 드려요.	We'll notify you when another team posts at this venue.	この会場で他チームの募集が開いたらお知らせします。	此球场有其他球队招募时会通知你。	Khi đội khác đăng tin ở sân này, chúng tôi sẽ báo.
뛸 수 있는 날을 올리면 팀 운영진이 용병으로 초대할 수 있어요.	Post when you can play and team staff can invite you as a guest.	プレーできる日を登録すると、チーム運営陣が助っ人として招待できます。	登记可踢球的日期，球队管理员可邀请你当外援。	Đăng ngày bạn đá được, ban điều hành đội có thể mời bạn đá khách.
우리 팀 경기의 용병 모집으로 초대해요.	Invite to your team's guest call.	自チームの試合の助っ人募集に招待します。	邀请参加本队比赛的外援招募。	Mời vào tin tuyển khách trận của đội bạn.
① 점수를 상대팀과 먼저 맞춰요. 확정되면 ② 선수 골·도움을 넣어요.	① Agree the score with the opponent first. Once confirmed, ② enter player goals and assists.	① まず相手チームとスコアを合わせます。確定したら ② 選手のゴール・アシストを入力します。	① 先与对手核对比分。确认后 ② 输入球员进球和助攻。	① Thống nhất tỉ số với đối thủ trước. Xác nhận xong ② nhập bàn thắng, kiến tạo.
차단하거나 운영자에게 신고해요.	Block, or report to the operator.	ブロックするか運営者に通報します。	屏蔽或向运营者举报。	Chặn hoặc báo cáo người vận hành.
차단한 사람과 팀을 보고 해제해요.	View and unblock people and teams.	ブロックした人とチームを確認・解除します。	查看并解除屏蔽的人和球队。	Xem và bỏ chặn người, đội.
문의·공지·신고 내역을 한곳에서 봐요.	Inquiries, notices and reports in one place.	お問い合わせ・お知らせ・通報履歴をまとめて確認。	咨询、公告和举报集中查看。	Hỏi đáp, thông báo và báo cáo ở một nơi.
초안이에요. 전문가 검토 전이에요.	Draft — not yet reviewed by experts.	草案です。専門家の確認前です。	草案，尚未经专家审核。	Bản nháp — chưa qua chuyên gia.
출석·골·도움과 경기별 결과예요.	Attendance, goals, assists and match results.	出席・ゴール・アシストと試合ごとの結果です。	出勤、进球、助攻和各场结果。	Có mặt, bàn thắng, kiến tạo và kết quả từng trận.
상대 엠블럼·참여 선수가 자동으로 들어가요.	Opponent crest and players are filled in automatically.	相手エンブレム・参加選手が自動で入ります。	对手队徽和参赛球员会自动填入。	Logo đối thủ và cầu thủ được tự điền.
뒤로	Back	戻る	返回	Quay lại
집합	Meet	集合	集合	Tập trung
상대 수락 대기	Waiting for opponent	相手の承諾待ち	等待对方接受	Chờ đối thủ đồng ý
확인 필요	Needs review	確認が必要	需要确认	Cần xác nhận
상대팀 주장이 수락하면 일정이 바뀌어요. 그 전까지는 원래 일정 그대로예요.	The schedule changes once the opposing captain accepts. Until then it stays the same.	相手チームの主将が承諾すると日程が変わります。それまでは元の日程のままです。	对方队长接受后日程才会更改，在此之前保持原日程。	Lịch sẽ đổi khi đội trưởng đối thủ đồng ý. Trước đó giữ nguyên.
수락하면 일정이 바뀌고 팀원들은 다시 참여 투표를 해요.	If you accept, the schedule changes and teammates vote again.	承諾すると日程が変わり、メンバーは再度参加投票をします。	接受后日程会更改，队员需重新投票。	Nếu đồng ý, lịch sẽ đổi và đồng đội bình chọn lại.
일정 변경	Schedule change	日程変更	日程变更	Đổi lịch
제안	Proposal	提案	提议	Đề xuất
취소 사유:	Reason for cancellation:	キャンセル理由:	取消原因：	Lý do hủy:
참여 현황에서	In Attendance,	参加状況で	在参与情况中	Trong mục Tham gia,
하면 골·도움을 넣을 수 있어요. MVP 투표도 그때 열려요.	to enter goals and assists. MVP voting opens then too.	すると、ゴール・アシストを入力できます。MVP投票もそのとき始まります。	后即可输入进球和助攻，MVP投票也会开启。	thì có thể nhập bàn thắng, kiến tạo. Bình chọn MVP cũng mở lúc đó.
상대팀이 보낸 점수 — 확인해 주세요	Score sent by the opponent — please check	相手チームが送ったスコア — 確認してください	对手发来的比分 — 请确认	Tỉ số đối thủ gửi — hãy xác nhận
제안된 결과	Proposed result	提案された結果	提议的结果	Kết quả đề xuất
기준	basis	基準	为准	theo
개인 기록 고치기	Edit player records	個人記録を修正	修改个人记录	Sửa thành tích cá nhân
개인 기록 입력	Enter player records	個人記録を入力	输入个人记录	Nhập thành tích cá nhân
점수 다시 보내기	Resend score	スコアを再送	重新发送比分	Gửi lại tỉ số
점수 입력 (상대팀 확인)	Enter score (opponent confirms)	スコア入力（相手が確認）	输入比分（对方确认）	Nhập tỉ số (đối thủ xác nhận)
점수 고치기	Edit score	スコアを修正	修改比分	Sửa tỉ số
순서: ① 점수를 상대팀과 맞춰요 → ② 점수가 확정되면 선수 골·도움을 넣어요.	Order: ① agree the score with the opponent → ② once confirmed, enter player goals and assists.	手順: ① 相手チームとスコアを合わせる → ② 確定したら選手のゴール・アシストを入力。	顺序：① 与对手核对比分 → ② 确认后输入球员进球和助攻。	Thứ tự: ① thống nhất tỉ số với đối thủ → ② xác nhận xong nhập bàn thắng, kiến tạo.
해야 선수 기록을 넣을 수 있어요.	before you can enter player records.	しないと選手記録を入力できません。	后才能输入球员记录。	trước khi nhập thành tích cầu thủ.
상대팀을 먼저 정해주세요. 경기 정보 탭의	Set the opponent first. Use	先に相手チームを決めてください。試合情報タブの	请先设置对手。使用比赛信息页的	Hãy đặt đối thủ trước. Dùng
을 쓰면 돼요.	.	を使ってください。	即可。	.
우리 팀끼리 나눠서	Split our own team	自チームで分けて	本队内分组	Chia trong đội
경기 형식	Match format	試合形式	比赛形式	Thể thức
님에게 초대를 보냈어요.	— invite sent.	さんに招待を送りました。	已发送邀请。	— đã gửi lời mời.
구장 주소 (같은 구장인지 맞출 때 써요)	Venue address (used to match the same venue)	会場の住所（同じ会場か判断するのに使います）	球场地址（用于判断是否同一球场）	Địa chỉ sân (dùng để nhận ra cùng một sân)
어떤 모집을 알려드릴까요?	Which posts should we notify you about?	どの募集をお知らせしますか?	通知哪些招募?	Báo cho bạn tin tuyển nào?
축구·풋살 둘 다	Both soccer and futsal	サッカー・フットサル両方	足球和五人制都要	Cả bóng đá và futsal
축구만	Soccer only	サッカーのみ	仅足球	Chỉ bóng đá
풋살만	Futsal only	フットサルのみ	仅五人制	Chỉ futsal
이 구장에 다른 팀의 상대팀 모집·용병 모집이 올라오면 알림을 보내요. MY → 관심 구장에서 바꾸거나 뺄 수 있어요.	We'll notify you when another team posts an opponent or guest call here. Change or remove it in MY → Favorite venues.	この会場に他チームの対戦相手募集・助っ人募集が出たら通知します。MY → お気に入り会場で変更・削除できます。	此球场有其他球队发布约战或外援招募时会通知你。可在 MY → 关注球场 修改或移除。	Khi đội khác đăng tìm đối hay tuyển khách ở sân này, chúng tôi sẽ báo. Đổi hoặc bỏ ở MY → Sân yêu thích.
관심 구장에 넣기	Add to favorite venues	お気に入り会場に追加	加入关注球场	Thêm vào sân yêu thích
팀 종목	Team sport	チームの種目	球队项目	Môn của đội
GK 무료	GK free	GK無料	门将免费	GK miễn phí
숫자만 적으면 금액, 글로 적으면 그대로 보여요.	Numbers are shown as an amount; text is shown as typed.	数字だけなら金額、文字ならそのまま表示されます。	只填数字显示为金额，填文字则原样显示。	Chỉ ghi số sẽ hiện là số tiền, ghi chữ sẽ hiện nguyên văn.
(선택)	(optional)	（任意）	（选填）	(tùy chọn)
없으면 비워두세요	Leave empty if none	なければ空欄のまま	没有请留空	Không có thì để trống
적으면 용병 모집 글에 함께 보여요. 비워두면 안 보여요.	If filled in, it's shown in the guest call. Leave it empty to hide it.	入力すると助っ人募集に一緒に表示されます。空欄なら表示されません。	填写后会显示在外援招募中，留空则不显示。	Nếu điền sẽ hiện trong tin tuyển khách. Để trống thì không hiện.
모집이 끝났거나 찾을 수 없어요	This call has ended or can't be found	募集が終了したか見つかりません	招募已结束或找不到	Tin tuyển đã kết thúc hoặc không tìm thấy
이미 마감됐거나 경기가 바뀌었을 수 있어요. 매칭 → 용병에서 다른 모집을 볼 수 있어요.	It may have closed or the match changed. See other calls in Match → Guests.	すでに締め切られたか試合が変わった可能性があります。マッチング → 助っ人で他の募集を見られます。	可能已截止或比赛有变。可在 约战 → 外援 查看其他招募。	Có thể đã đóng hoặc trận đã đổi. Xem tin khác ở Ghép trận → Khách.
모집	Call	募集	招募	Tuyển
신청하면 이 팀 주장·운영진이 승인해요. 확정되면 알림이 가고, 이 팀과 대화방이 열려요. 참가비·보증금은 팀킥이 받지 않아요.	The team's captain or staff approve applications. Once confirmed you'll be notified and a chat with the team opens. TeamKick doesn't collect fees or deposits.	申請するとこのチームの主将・運営陣が承認します。確定すると通知が届き、このチームとのトークルームが開きます。参加費・保証金はチームキックでは受け取りません。	申请后由该队队长/管理员批准。确认后会收到通知，并开启与该队的聊天。TeamKick不收取参赛费或押金。	Đội trưởng/ban điều hành của đội sẽ duyệt. Khi xác nhận bạn sẽ nhận thông báo và phòng chat với đội được mở. TeamKick không thu phí hay tiền cọc.
신청 완료 · 승인 대기	Applied · awaiting approval	申請完了 · 承認待ち	已申请 · 等待批准	Đã đăng ký · chờ duyệt
남길 말	Message	メッセージ	留言	Lời nhắn
골 기록 (선택) — 시간과 도움	Goal log (optional) — time and assist	ゴール記録（任意）— 時間とアシスト	进球记录（选填）— 时间和助攻	Nhật ký bàn thắng (tùy chọn) — phút và kiến tạo
번째	th	点目	个	thứ
골 시간(분)	Goal time (min)	ゴール時間（分）	进球时间（分钟）	Phút ghi bàn
골 도움	Goal assist	ゴールのアシスト	进球助攻	Kiến tạo
도움 없음	No assist	アシストなし	无助攻	Không kiến tạo
도움을 기록하려면 위에서 선수 도움 수를 먼저 올려 주세요.	To record an assist, first raise that player's assist count above.	アシストを記録するには、先に上で選手のアシスト数を増やしてください。	要记录助攻，请先在上方增加该球员的助攻数。	Để ghi kiến tạo, hãy tăng số kiến tạo của cầu thủ ở trên trước.
용병·미상 골	Guest / unknown goals	助っ人・不明ゴール	外援/不明进球	Bàn của khách / không rõ
팀이 정해지지 않은 출석자는 골을 넣을 수 없어요. 경기 상세의	Attendees without a side can't score. Set sides first in	チームが決まっていない出席者はゴールを入れられません。試合詳細の	未分组的出勤者无法记录进球。请先在比赛详情的	Người có mặt chưa có phe không thể ghi bàn. Hãy chia phe trước ở
에서 먼저 정해주세요.	first.	で先に決めてください。	中设定。	.
상대팀과 확정한 점수	Score agreed with the opponent	相手チームと確定したスコア	与对手确认的比分	Tỉ số đã xác nhận với đối thủ
이 점수에 맞게 우리 선수의 골·도움을 넣어 주세요. 골마다 시간과 도움을 이을 수 있어요.	Enter our players' goals and assists to match this score. You can add a time and assist to each goal.	このスコアに合うように選手のゴール・アシストを入力してください。ゴールごとに時間とアシストをつなげられます。	请按此比分输入本队球员的进球和助攻。每个进球可填写时间和助攻。	Nhập bàn thắng, kiến tạo của cầu thủ cho khớp tỉ số này. Mỗi bàn có thể ghi phút và người kiến tạo.
확정 점수	Confirmed score	確定スコア	确认比分	Tỉ số đã xác nhận
골 많아요	too many goals	ゴール多いです	球多了	bàn thừa
골 모자라요	goals short	ゴール足りません	球不够	bàn thiếu
개인 기록 저장	Save player records	個人記録を保存	保存个人记录	Lưu thành tích cá nhân
상대팀에 점수 확인을 요청했어요.	Asked the opponent to confirm the score.	相手チームにスコア確認を依頼しました。	已请求对手确认比分。	Đã nhờ đối thủ xác nhận tỉ số.
점수를 저장했어요. 이제 선수 골·도움을 넣어 주세요.	Score saved. Now enter player goals and assists.	スコアを保存しました。選手のゴール・アシストを入力してください。	比分已保存。现在请输入球员进球和助攻。	Đã lưu tỉ số. Giờ hãy nhập bàn thắng, kiến tạo.
앱 안에서 매칭된 경기는 상대 주장이 확인하면 확정돼요. 외부 팀 경기는 바로 확정돼요. 확정되면 홈 화면에	Matches made in the app are confirmed when the opposing captain confirms. Matches against outside teams are confirmed right away. Once confirmed, the home screen shows	アプリ内でマッチングした試合は相手の主将が確認すると確定します。外部チームとの試合はすぐ確定します。確定するとホーム画面に	应用内约战的比赛需对方队长确认后生效。与外部球队的比赛立即生效。确认后首页会显示	Trận ghép trong ứng dụng được xác nhận khi đội trưởng đối thủ xác nhận. Trận với đội ngoài xác nhận ngay. Sau đó màn hình chính hiện
안내가 떠요.	prompt.	の案内が表示されます。	提示。	.
상대팀에 점수 보내기	Send score to opponent	相手チームにスコアを送る	向对手发送比分	Gửi tỉ số cho đối thủ
점수 저장	Save score	スコアを保存	保存比分	Lưu tỉ số
변경 제안을 보냈어요. 상대팀 주장이 수락하면 일정이 바뀌어요.	Change proposed. The schedule changes when the opposing captain accepts.	変更を提案しました。相手チームの主将が承諾すると日程が変わります。	已发送变更提议。对方队长接受后日程会更改。	Đã gửi đề xuất đổi. Lịch sẽ đổi khi đội trưởng đối thủ đồng ý.
일정 변경 제출	Submit schedule change	日程変更を送信	提交日程变更	Gửi đổi lịch
공지 등록	Post notice	お知らせを登録	发布公告	Đăng thông báo
매칭 모집	Opponent call	マッチング募集	约战招募	Tìm đối
팀 사진 (정사각형으로 잘라요)	Team photo (cropped square)	チーム写真（正方形に切り抜き）	球队照片（裁成正方形）	Ảnh đội (cắt vuông)
차단한 팀 · 해제·신고	Blocked team · unblock / report	ブロックしたチーム · 解除・通報	已屏蔽球队 · 解除/举报	Đội đã chặn · bỏ chặn / báo cáo
팀 차단·신고	Block · report team	チームのブロック・通報	屏蔽·举报球队	Chặn · báo cáo đội
가입할 수 있는 승인된 팀을 표시합니다.	Showing approved teams you can join.	参加できる承認済みチームを表示します。	显示可加入的已认证球队。	Hiển thị các đội đã duyệt bạn có thể tham gia.
새 알림	New notifications	新しい通知	新通知	Thông báo mới
운영자만 볼 수 있어요	Only the operator can see this	運営者のみ閲覧できます	仅运营者可见	Chỉ người vận hành xem được
서비스 운영자로 등록	Register as service operator	サービス運営者として登録	注册为服务运营者	Đăng ký làm người vận hành
브라우저로 잘 옮겨 왔어요. 이제	You're now in the browser. Tap	ブラウザに移動できました。あとは	已切换到浏览器。现在点	Đã chuyển sang trình duyệt. Giờ nhấn
를 누르면 앱처럼 쓸 수 있어요.	to use it like an app.	を押すとアプリのように使えます。	即可像App一样使用。	để dùng như ứng dụng.
지금은 앱 안 브라우저라 설치·알림이 안 돼요	This in-app browser can't install or receive notifications	今はアプリ内ブラウザのため、インストール・通知ができません	当前是应用内浏览器，无法安装或接收通知	Trình duyệt trong ứng dụng không cài đặt hay nhận thông báo được
개만 하면 끝나요	left to finish	個で完了です	项即可完成	mục nữa là xong
열린 브라우저에서 로그인하면 홈 화면 추가·알림을 켤 수 있어요.	Log in in the opened browser to add to home screen and turn on notifications.	開いたブラウザでログインすると、ホーム画面への追加・通知をオンにできます。	在打开的浏览器中登录后即可添加到主屏幕并开启通知。	Đăng nhập trong trình duyệt vừa mở để thêm vào màn hình chính và bật thông báo.
자물쇠(또는 ⓘ)	lock (or ⓘ)	鍵（またはⓘ）	锁形（或ⓘ）	ổ khóa (hoặc ⓘ)
으로 바꾼 뒤 다시 눌러주세요.	then tap again.	に変えてからもう一度押してください。	后再点一次。	rồi nhấn lại.
에서 이유를 볼 수 있어요.	to see why.	で理由を確認できます。	中查看原因。	để xem lý do.
상대팀이 보낸 점수가 맞나요?	Is the opponent's score right?	相手チームが送ったスコアは合っていますか?	对手发来的比分对吗?	Tỉ số đối thủ gửi có đúng không?
경기 점수를 먼저 상대팀과 맞춰주세요	Agree the match score with the opponent first	まず相手チームと試合スコアを合わせてください	请先与对手核对比分	Hãy thống nhất tỉ số với đối thủ trước
경기 점수를 넣어주세요	Enter the match score	試合スコアを入力してください	请输入比赛比分	Hãy nhập tỉ số trận
점수가 확정됐어요. 개인 기록을 넣어주세요	Score confirmed. Enter player records	スコアが確定しました。個人記録を入力してください	比分已确认。请输入个人记录	Tỉ số đã xác nhận. Hãy nhập thành tích cá nhân
점수가 확정됐어요. 출석을 확정해 주세요	Score confirmed. Confirm attendance	スコアが確定しました。出席を確定してください	比分已确认。请确认出勤	Tỉ số đã xác nhận. Hãy xác nhận có mặt
네, 맞아요	Yes, that's right	はい、合っています	对，没错	Đúng rồi
점수가 달라요	Score is different	スコアが違います	比分不对	Tỉ số khác
점수 입력	Enter score	スコア入力	输入比分	Nhập tỉ số
출석 확정하기	Confirm attendance	出席を確定	确认出勤	Xác nhận có mặt
승리	Wins	勝利	胜场	Thắng
득실	GD	得失	得失	Hiệu số
(우리 팀)	(our team)	（自チーム）	（本队）	(đội ta)
선수·팀	Players · Teams	選手・チーム	球员·球队	Cầu thủ · Đội
팀 랭킹 항목	Team ranking category	チームランキング項目	球队排名项目	Hạng mục xếp hạng đội
팀킥에서 매칭해 점수를 서로 확인한 경기가 없어요.	No matches made on TeamKick with a score confirmed by both teams.	チームキックでマッチングし、両チームがスコアを確認した試合がありません。	没有在TeamKick约战且双方确认比分的比赛。	Chưa có trận ghép trên TeamKick được hai đội xác nhận tỉ số.
사진·포지션·주발·활동 지역·인스타그램 아이디가 다른 팀 이용자에게 보여요. 키·몸무게·나이·생일은 보이지 않아요.	Your photo, position, strong foot, areas and Instagram ID are shown to other teams. Height, weight, age and birthday are not.	写真・ポジション・利き足・活動地域・InstagramのIDが他チームの利用者に表示されます。身長・体重・年齢・誕生日は表示されません。	照片、位置、惯用脚、活动地区和Instagram账号会对其他球队用户显示。身高、体重、年龄、生日不显示。	Ảnh, vị trí, chân thuận, khu vực và ID Instagram hiển thị cho đội khác. Chiều cao, cân nặng, tuổi, sinh nhật không hiển thị.
이번 주는 월요일부터 일요일까지예요.	This week runs Monday to Sunday.	今週は月曜日から日曜日までです。	本周为周一至周日。	Tuần này tính từ thứ Hai đến Chủ nhật.
프로필	Profile	プロフィール	资料	Hồ sơ
이 선수는 프로필을 공개하지 않았어요. 이름·팀·기록만 보여요.	This player's profile is private. Only name, team and stats are shown.	この選手はプロフィールを公開していません。名前・チーム・記録のみ表示されます。	该球员未公开资料，仅显示姓名、球队和记录。	Cầu thủ này không công khai hồ sơ. Chỉ hiện tên, đội và thành tích.
링크가 안 열리면 이 코드를	If the link won't open, enter this code in	リンクが開かない場合はこのコードを	链接打不开时，请把此代码输入到	Nếu liên kết không mở, hãy nhập mã này vào
에 넣으면 돼요.	.	に入力してください。	即可。	.
경기 사진이나 단체 사진을 올려보세요.	Try posting match or team photos.	試合写真や集合写真を載せてみましょう。	上传比赛照片或合影吧。	Hãy đăng ảnh trận đấu hoặc ảnh tập thể.
에 주로 뛰는 팀	— when the team usually plays	によくプレーするチーム	常踢球的球队	— thời gian đội thường đá
기록 기간	Period	記録期間	记录期间	Khoảng thời gian
저장하지 못했어요. 다시 시도해주세요.	Couldn't save. Please try again.	保存できませんでした。もう一度お試しください。	保存失败，请重试。	Không lưu được. Hãy thử lại.
다른 팀	Other teams	他のチーム	其他球队	Đội khác
다른 팀 새 알림	New notifications in other teams	他のチームの新しい通知	其他球队的新通知	Thông báo mới ở đội khác
이 팀은 이용이 정지되어 읽기만 가능합니다.	This team is suspended and read-only.	このチームは利用停止中のため閲覧のみ可能です。	该球队已被停用，仅可查看。	Đội này đang bị đình chỉ, chỉ xem được.
상대팀에 점수가 다르다고 알렸어요.	Told the opponent the score is different.	相手チームにスコアが違うと伝えました。	已告知对手比分不对。	Đã báo đối thủ rằng tỉ số khác.
점수를 확정했어요. 이제 개인 기록을 넣어 주세요.	Score confirmed. Now enter player records.	スコアを確定しました。個人記録を入力してください。	比分已确认。现在请输入个人记录。	Đã xác nhận tỉ số. Giờ hãy nhập thành tích cá nhân.
완료	Completed	完了	已完成	Hoàn tất
경기 · 결과 확정	matches · results confirmed	試合 · 結果確定	场 · 结果已确认	trận · đã xác nhận kết quả
경기 · 출석 확정	matches · attendance confirmed	試合 · 出席確定	场 · 出勤已确认	trận · đã xác nhận có mặt
· 결과 확인 필요	· results need checking	· 結果の確認が必要	· 需确认结果	· cần xác nhận kết quả
머리글을 누르면 그 순서로 줄 세워요.	Tap a header to sort by it.	見出しを押すとその順に並べ替えます。	点表头即可按该项排序。	Nhấn tiêu đề để sắp xếp theo cột đó.
아직 선수가 없어요	No players yet	まだ選手がいません	还没有球员	Chưa có cầu thủ
골·도움은 경기 결과와 개인 기록이 모두 확정되면 반영돼요. 출석은 실제 참석 확정 기준, MVP는 마감된 투표 기준이에요.	Goals and assists count once both the result and player records are confirmed. Attendance uses confirmed attendance; MVP uses closed votes.	ゴール・アシストは試合結果と個人記録の両方が確定すると反映されます。出席は実際の出席確定、MVPは締め切った投票が基準です。	进球和助攻在比赛结果和个人记录都确认后计入。出勤以实际确认为准，MVP以截止的投票为准。	Bàn thắng, kiến tạo được tính khi cả kết quả và thành tích cá nhân đã xác nhận. Có mặt theo xác nhận thực tế, MVP theo phiếu đã đóng.
안 읽은 채팅	Unread chats	未読チャット	未读聊天	Chat chưa đọc
마감됨	Closed	締切済み	已截止	Đã đóng
경기 공유 이미지 만들기	Make match share image	試合の共有画像を作成	生成比赛分享图片	Tạo ảnh chia sẻ trận
· 용병	· guests	· 助っ人	· 外援	· khách
구장 지도	Venue map	会場マップ	球场地图	Bản đồ sân
지도를 불러오는 중…	Loading map…	地図を読み込み中…	正在加载地图…	Đang tải bản đồ…
지도에 없는 구장	Venues not on the map	地図にない会場	地图上没有的球场	Sân không có trên bản đồ
강수	Rain	降水	降水	Mưa
날씨: 기상청 예보(경기 시각 기준으로 남겨 둔 값)	Weather: KMA forecast (saved for kick-off time)	天気: 気象庁予報（試合時刻基準で保存した値）	天气：韩国气象厅预报（按开赛时间保存）	Thời tiết: dự báo KMA (lưu theo giờ đá)
날씨를 지금 불러오지 못했어요.	Couldn't load the weather right now.	今は天気を読み込めませんでした。	暂时无法加载天气。	Hiện không tải được thời tiết.
날씨 예보는 경기 약 3일 전부터 나와요.	Forecasts appear about 3 days before the match.	天気予報は試合の約3日前から出ます。	天气预报约在比赛前3天发布。	Dự báo có từ khoảng 3 ngày trước trận.
비 예보가 있어요.	Rain is forecast.	雨の予報があります。	有降雨预报。	Có dự báo mưa.
미세먼지:	Fine dust:	PM10:	细颗粒物：	Bụi mịn:
언어 · Language	Language · 언어	言語 · Language	语言 · Language	Ngôn ngữ · Language
약관·개인정보처리방침과 팀원이 쓴 글은 원문 그대로 보여요.	Terms, privacy policy and posts written by users stay in the original Korean.	利用規約・個人情報処理方針とメンバーの投稿は原文のまま表示されます。	条款、隐私政策和用户发布的内容保持韩文原文。	Điều khoản, chính sách quyền riêng tư và bài viết của người dùng giữ nguyên tiếng Hàn.
이 기간에 팀킥에서 매칭해 점수를 서로 확인한 경기가 없어요.	No matches made on TeamKick with a score confirmed by both teams in this period.	この期間、チームキックでマッチングし両チームがスコアを確認した試合はありません。	此期间没有在TeamKick约战且双方确认比分的比赛。	Giai đoạn này chưa có trận ghép trên TeamKick được hai đội xác nhận tỉ số.
경기 매칭 대화는	Match chats can only be written by	試合マッチングの会話は	约战对话只有	Chat ghép trận chỉ
주장·운영진만	captains and staff	主将・運営陣のみ	队长和管理员	đội trưởng và ban điều hành
입력할 수 있어요. 필요한 내용은 우리 팀 주장·운영진에게 알려 주세요.	. Tell your captain or staff what you need.	入力できます。必要なことは自チームの主将・運営陣に伝えてください。	可以输入。如有需要请告诉本队队长或管理员。	mới nhập được. Cần gì hãy báo đội trưởng hoặc ban điều hành.
가입자	Sign-ups	登録者	注册用户	Người đăng ký
7일	7 days	7日	7天	7 ngày
30일	30 days	30日	30天	30 ngày
새 가입	New sign-ups	新規登録	新注册	Đăng ký mới
접속한 사람	Active users	アクセスした人	访问用户	Người truy cập
팀에 들어간 사람	In a team	チーム所属者	已入队	Đã vào đội
알림 켠 사람	Notifications on	通知オン	开启通知	Bật thông báo
숫자만 보여요. 누가 가입했는지는 보이지 않아요. 접속한 사람은 2026년 10월 20일부터 센 숫자예요.	Counts only — you can't see who signed up. Active users are counted from Oct 20, 2026.	数だけ表示します。誰が登録したかは見えません。アクセスした人は2026年10月20日から数えています。	仅显示数字，看不到具体是谁注册。访问用户从2026年10月20日开始统计。	Chỉ hiện con số, không thấy ai đăng ký. Người truy cập được tính từ 20/10/2026.`;
export default DICT;

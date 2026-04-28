export const PINPLE_ASSETS = {
  illustrations: {
    happy: "/assets/illustrations/ip-happy.svg",
    heart: "/assets/illustrations/ip-heart.svg",
    searchFriend: "/assets/illustrations/ip-search-friend.svg",
    networkLink: "/assets/illustrations/ip-network-link.svg",
    taskList: "/assets/illustrations/ip-task-list.svg",
    babyGrowth: "/assets/illustrations/ip-baby-growth.svg",
    cyberYuelao: "/assets/illustrations/ip-cyber-yuelao.svg",
    familyHelper: "/assets/illustrations/ip-family-helper.svg",
    emptyAddFriend: "/assets/illustrations/empty-add-friend.svg",
    emptyTask: "/assets/illustrations/empty-task.svg",
    emptyGrowth: "/assets/illustrations/empty-growth.svg",
    inviteFriend: "/assets/illustrations/invite-friend.svg",
  },
  avatars: {
    father: "/assets/avatars/father.svg",
    mother: "/assets/avatars/mother.svg",
    grandpa: "/assets/avatars/grandpa.svg",
    grandma: "/assets/avatars/grandma.svg",
    childBoy02: "/assets/avatars/child-boy-0-2.svg",
    dog: "/assets/avatars/dog.svg",
    cat: "/assets/avatars/cat.svg",
    mystery: "/assets/avatars/mystery-person.svg",
  },
  icons: {
    timeline: "/assets/icons/timeline.svg",
    handbook: "/assets/icons/handbook.svg",
    network: "/assets/icons/network.svg",
    family: "/assets/icons/family.svg",
    opportunity: "/assets/icons/opportunity.svg",
    help: "/assets/icons/help.svg",
    match: "/assets/icons/match.svg",
    astrology: "/assets/icons/astrology.svg",
    baby: "/assets/icons/baby.svg",
    task: "/assets/icons/task.svg",
    event: "/assets/icons/event.svg",
    memo: "/assets/icons/memo.svg",
    health: "/assets/icons/health.svg",
    addFriend: "/assets/icons/add-friend.svg",
    search: "/assets/icons/search.svg",
    message: "/assets/icons/message.svg",
    profile: "/assets/icons/profile.svg",
  },
} as const;

export const MOCK_USER = {
  id: 1,
  name: "Evan",
  email: "evan@pinple.app",
  creditScore: 89,
  reportedCount: 0,
};

export const MOCK_FAMILY_MEMBERS = [
  { name: "爸爸", role: "父亲", avatar: PINPLE_ASSETS.avatars.father },
  { name: "妈妈", role: "母亲", avatar: PINPLE_ASSETS.avatars.mother },
  { name: "爷爷", role: "长辈", avatar: PINPLE_ASSETS.avatars.grandpa },
  { name: "奶奶", role: "长辈", avatar: PINPLE_ASSETS.avatars.grandma },
  { name: "宝宝", role: "小太阳", avatar: PINPLE_ASSETS.avatars.childBoy02 },
];

export const MOCK_FRIENDS = [
  { name: "Doris", distance: "1度好友", strength: 92, reason: "妈妈同学，常交流育儿经验" },
  { name: "Cloud", distance: "1度好友", strength: 88, reason: "同城朋友，可推荐兼职机会" },
  { name: "Jason", distance: "2度好友", strength: 76, reason: "共同好友 Cloud 推荐" },
  { name: "小李", distance: "2度好友", strength: 72, reason: "项目合作关系" },
  { name: "小王", distance: "3度好友", strength: 65, reason: "朋友的同事，适合工作内推" },
];

export const MOCK_OPPORTUNITIES = [
  {
    title: "UI设计兼职",
    type: "兼职机会",
    chain: "Evan -> Doris -> 设计团队",
    recommender: "Doris",
    trust: 92,
    reward: "¥800-1200/天",
    time: "本周可聊",
    location: "远程",
  },
  {
    title: "工作推荐",
    type: "工作推荐",
    chain: "Evan -> Cloud -> 产品负责人",
    recommender: "Cloud",
    trust: 88,
    reward: "全职面试",
    time: "3天内",
    location: "深圳/远程",
  },
  {
    title: "项目合作",
    type: "项目合作",
    chain: "Evan -> Jason",
    recommender: "Jason",
    trust: 81,
    reward: "按项目结算",
    time: "下周启动",
    location: "线上",
  },
  {
    title: "技能互助",
    type: "生活互助",
    chain: "Evan -> 小李",
    recommender: "小李",
    trust: 78,
    reward: "互换资源",
    time: "可预约",
    location: "同城",
  },
];

export const MOCK_FAMILY_EVENTS = [
  { title: "宝宝生日", date: "6月12日", type: "生日", icon: "event" },
  { title: "幼儿园开学", date: "9月1日", type: "成长", icon: "baby" },
  { title: "全家旅行", date: "国庆假期", type: "家庭", icon: "family" },
  { title: "搬新家", date: "下月", type: "大事件", icon: "memo" },
];

export const MOCK_MATCH_RECOMMENDATIONS = [
  { title: "朋友介绍", score: 86, path: "Evan -> Doris -> 她的大学同学", reason: "共同好友多，生活节奏接近" },
  { title: "闺蜜介绍", score: 82, path: "妈妈 -> 闺蜜 -> 设计师朋友", reason: "家庭观念相似，沟通稳定" },
  { title: "兄弟介绍", score: 79, path: "Jason -> 兄弟 -> 创业者", reason: "共同兴趣：旅行、摄影" },
  { title: "室友介绍", score: 75, path: "Cloud -> 室友", reason: "同城，社交圈可信" },
];

export const MOCK_BABY_PROFILE = {
  name: "小太阳",
  age: "2岁3个月20天",
  height: "92cm",
  weight: "13.6kg",
  growthRecords: 1286,
  mediaCount: 862,
};

export const MOCK_FAMILY_TASKS = [
  "洗宝宝衣物",
  "准备辅食",
  "陪宝宝阅读绘本",
  "整理玩具和房间",
];

export const MOCK_HANDBOOKS = [
  { title: "家庭手册", count: 42, updated: "今天更新", icon: "family" },
  { title: "朋友手册", count: 28, updated: "昨天更新", icon: "network" },
  { title: "人脉手册", count: 63, updated: "3天前更新", icon: "opportunity" },
  { title: "成长手册", count: 1286, updated: "刚刚更新", icon: "baby" },
];

export const MOCK_MESSAGES = [
  { from: "Doris", text: "我把 UI 兼职机会发给你了", time: "10:09" },
  { from: "妈妈", text: "今晚记得整理宝宝相册", time: "09:42" },
  { from: "Cloud", text: "Jason 想约你聊项目合作", time: "昨天" },
];

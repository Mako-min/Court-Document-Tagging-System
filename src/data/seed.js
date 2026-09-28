export const labels = [
  {
    code: 'SF',
    name: '个别事实判断',
    color: '#21877b',
    description: '针对本案具体对象、行为或事件的事实判断。',
    example: '被告于2024年3月1日收到原告支付的货款。',
  },
  {
    code: 'GF',
    name: '一般事实判断',
    color: '#5784ba',
    description: '常识、经验法则或专业知识等一般性事实判断。',
    example: '银行转账记录通常能够反映资金交付的时间与金额。',
  },
  {
    code: 'SM',
    name: '个别规范判断',
    color: '#b37c3d',
    description: '法院针对本案作出的规范评价或裁判结论。',
    example: '被告应当向原告支付尚欠的货款。',
  },
  {
    code: 'GM',
    name: '一般规范判断',
    color: '#8b70b5',
    description: '法律条文、合同条款或交易习惯等规范性依据。',
    example: '当事人应当按照约定全面履行自己的义务。',
  },
];

export const relationTypes = [
  { code: 'S', name: '支持', description: '起点命题为终点命题成立提供理由。' },
  { code: 'A', name: '反对', description: '起点命题为终点命题不成立提供理由。' },
  { code: 'J', name: '组合', description: '多个起点命题共同构成不可缺少的理由。' },
  { code: 'M', name: '匹配', description: '个别判断与一般判断之间的对应。' },
  { code: 'I', name: '同一', description: '两个命题表达相同的判断内容。' },
];

export const members = ['林同学', '陈同学', '王同学', '李同学'];

const paragraphs = [
  '原告明川商贸有限公司与被告远山科技有限公司买卖合同纠纷一案，本院依法适用简易程序，公开开庭进行了审理。本案现已审理终结。',
  '本院经审理认定：2024年3月1日，原、被告签订设备采购合同，约定由原告向被告供应办公设备，合同总价款为人民币86,000元。原告已按约交付全部设备，被告签收后未提出质量异议。',
  '被告已支付货款50,000元，尚欠货款36,000元。原告多次催告后，被告仍未履行剩余付款义务。上述事实，有采购合同、送货单、转账记录及双方陈述在案佐证。',
  '本院认为：依法成立的合同，对当事人具有法律约束力。当事人应当按照约定全面履行自己的义务。原、被告之间的设备采购合同系双方真实意思表示，内容不违反法律、行政法规的强制性规定，应认定为有效。',
  '原告已经履行供货义务，被告应依约支付相应价款。被告未按约支付剩余货款的行为构成违约，应当承担继续履行的责任。原告要求被告支付剩余货款36,000元的诉讼请求，本院予以支持。',
  '综上，判决如下：被告远山科技有限公司于本判决生效之日起十日内向原告明川商贸有限公司支付货款人民币36,000元。',
];

function document(id, title, category, number, status = '未开始') {
  const text = paragraphs.join('\n\n');
  return {
    id,
    title,
    category,
    number,
    court: '明川市示例人民法院',
    date: '2024-05-20',
    text,
    status,
    annotations: [],
    relations: [],
    updatedAt: '2026-09-27T09:30:00.000Z',
  };
}

export function createSeed() {
  const documents = [
    document(
      'D001',
      '明川商贸与远山科技买卖合同纠纷',
      '买卖合同纠纷',
      '（2024）示0102民初1286号',
      '标注中',
    ),
    document('D002', '星禾公司劳动合同纠纷', '劳动合同纠纷', '（2024）示0102民初1362号'),
    document(
      'D003',
      '青屿物业服务合同纠纷',
      '物业服务合同纠纷',
      '（2024）示0102民初1428号',
      '待裁定',
    ),
    document(
      'D004',
      '望山房屋租赁合同纠纷',
      '房屋租赁合同纠纷',
      '（2024）示0102民初1506号',
      '已完成',
    ),
    document('D005', '云桥建设工程合同纠纷', '建设工程合同纠纷', '（2024）示0102民初1613号'),
  ];
  // 演示文书完全虚构；不同案由使用独立的示例段落。
  documents[1].text =
    '原告林某与被告星禾公司劳动合同纠纷一案，本院依法进行了审理。\n\n本院查明：林某于2023年6月入职星禾公司，双方签订书面劳动合同。星禾公司尚未向林某支付2024年4月工资8,000元。\n\n本院认为：用人单位应当及时足额向劳动者支付劳动报酬。星禾公司应向林某支付尚欠工资8,000元。';
  documents[2].text =
    '原告青屿物业公司与被告赵某物业服务合同纠纷一案，本院依法进行了审理。\n\n本院查明：青屿物业公司已按照合同约定提供公共区域保洁和设施维护服务。赵某尚欠物业费3,600元。\n\n本院认为：当事人应当按照约定全面履行自己的义务。赵某应当向青屿物业公司支付物业费3,600元。';
  documents[3].text =
    '原告钱某与被告孙某房屋租赁合同纠纷一案，本院依法进行了审理。\n\n本院查明：钱某已将案涉房屋交付孙某使用，孙某尚欠两个月租金共6,000元。\n\n本院认为：承租人应当按照约定期限支付租金。孙某应当向钱某支付租金6,000元。';
  documents[4].text =
    '原告云桥公司与被告周某建设工程合同纠纷一案，本院依法进行了审理。\n\n本院查明：双方签订施工合同，约定工程款为120,000元。工程已验收合格，周某尚欠工程款20,000元。\n\n本院认为：当事人应当按照约定全面履行自己的义务。周某应当向云桥公司支付剩余工程款20,000元。';
  function mark(doc, id, quote, label) {
    const start = doc.text.indexOf(quote);
    return { id, start, end: start + quote.length, text: quote, label, note: '', subtype: '' };
  }
  documents[0].annotations = [
    mark(documents[0], 'P1', '原告已按约交付全部设备，被告签收后未提出质量异议。', 'SF'),
    mark(documents[0], 'P2', '当事人应当按照约定全面履行自己的义务。', 'GM'),
    mark(
      documents[0],
      'P3',
      '被告未按约支付剩余货款的行为构成违约，应当承担继续履行的责任。',
      'SM',
    ),
  ];
  documents[0].annotations[1].subtype = '法律条文';
  documents[0].relations = [{ id: 'R1', sources: ['P1', 'P2'], target: 'P3', type: 'J' }];
  for (const index of [2, 3]) {
    const doc = documents[index];
    const fact = index === 2 ? '赵某尚欠物业费3,600元。' : '孙某尚欠两个月租金共6,000元。';
    const conclusion =
      index === 2 ? '赵某应当向青屿物业公司支付物业费3,600元。' : '孙某应当向钱某支付租金6,000元。';
    doc.annotations = [mark(doc, 'P1', fact, 'SF'), mark(doc, 'P2', conclusion, 'SM')];
    doc.relations = [{ id: 'R1', sources: ['P1'], target: 'P2', type: 'S' }];
  }
  return {
    documents,
    tasks: [
      {
        id: 'T2026001',
        name: '买卖合同 · 裁判理由标注',
        description: '围绕合同履行与违约责任，识别事实、规范和裁判结论，并建立论证关系。',
        category: '买卖合同纠纷',
        documentIds: ['D001'],
        members: ['林同学', '陈同学'],
        adjudicator: '王同学',
        owner: '林同学',
        deadline: '2026-10-15',
        status: '标注中',
        guideVersion: 'v1.0',
        createdAt: '2026-09-27',
      },
      {
        id: 'T2026002',
        name: '劳动争议 · 事实与规范识别',
        description: '识别劳动关系中的事实认定及规范依据。',
        category: '劳动合同纠纷',
        documentIds: ['D002'],
        members: ['林同学', '李同学'],
        adjudicator: '王同学',
        owner: '陈同学',
        deadline: '2026-10-18',
        status: '未开始',
        guideVersion: 'v1.0',
        createdAt: '2026-09-26',
      },
      {
        id: 'T2026003',
        name: '物业服务 · 论证关系复核',
        description: '对两份独立标注中的标签分歧进行人工裁定。',
        category: '物业服务合同纠纷',
        documentIds: ['D003'],
        members: ['陈同学', '李同学'],
        adjudicator: '林同学',
        owner: '林同学',
        deadline: '2026-10-10',
        status: '待裁定',
        guideVersion: 'v1.0',
        createdAt: '2026-09-25',
      },
      {
        id: 'T2026004',
        name: '房屋租赁 · 标注示例集',
        description: '已完成的示例任务，用于展示结构化成果。',
        category: '房屋租赁合同纠纷',
        documentIds: ['D004'],
        members: ['林同学', '王同学'],
        adjudicator: '李同学',
        owner: '林同学',
        deadline: '2026-09-25',
        status: '已完成',
        guideVersion: 'v1.0',
        createdAt: '2026-09-23',
      },
      {
        id: 'T2026005',
        name: '建设工程 · 第一轮独立标注',
        description: '整理工程价款争议中的论证结构。',
        category: '建设工程合同纠纷',
        documentIds: ['D005'],
        members: ['王同学', '李同学'],
        adjudicator: '陈同学',
        owner: '王同学',
        deadline: '2026-10-20',
        status: '未开始',
        guideVersion: 'v1.0',
        createdAt: '2026-09-22',
      },
    ],
    conflicts: [
      {
        id: 'C001',
        documentId: 'D003',
        annotationId: 'P2',
        type: '标签分歧',
        quote: '赵某应当向青屿物业公司支付物业费3,600元。',
        left: { author: '陈同学', label: 'SF', reason: '将付款义务理解为对欠款事实的描述。' },
        right: { author: '李同学', label: 'SM', reason: '这是法院针对本案作出的给付义务判断。' },
        status: '待处理',
        decision: '',
        note: '',
      },
    ],
    exports: [],
  };
}

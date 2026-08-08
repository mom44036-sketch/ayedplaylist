/**
 * data.js
 * -----------------------------------------------------------------------
 * Static course content: the list of sections and the items (video / file
 * / quiz) inside each one, plus the localStorage key used to persist the
 * learner's progress.
 *
 * This is pure data — no logic lives here on purpose, so the content can
 * be scanned / edited independently from the app behaviour.
 * -----------------------------------------------------------------------
 */

// Key used to store/read the learner's progress in localStorage.
const STORAGE_KEY = "step-course-progress-v1";

// The full course outline: an array of sections, each with an "items" array.
const COURSE_SECTIONS = [
  {
    id: "s1",
    title: "القسم الأول: مقدمة عن اختبار STEP",
    items: [
      {
        id: "v1",
        type: "video",
        title: "ما هو اختبار STEP وأهميته الأكاديمية",
        duration: "12:34",
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        summary:
          "في هذا الدرس التأسيسي نتعرف على ماهية اختبار STEP كأحد أهم اختبارات الكفايات في اللغة الإنجليزية المعتمدة في المملكة، ولماذا يعتبر بوابة للقبول الجامعي والوظائف.",
        bullets: [
          "تعريف اختبار STEP والجهة المنظمة له",
          "الفرق بين STEP و IELTS و TOEFL",
          "الحد الأدنى للدرجات المطلوبة للجامعات",
        ],
      },
      {
        id: "v2",
        type: "video",
        title: "هيكلة الاختبار وتوزيع الدرجات بالتفصيل",
        duration: "18:20",
        url: "https://samplelib.com/mp4/sample-15s-720p.mp4",
        summary:
          "شرح مفصل لأقسام الاختبار الأربعة وكيفية توزيع 100 سؤال، مع استراتيجية تقسيم الوقت المثالي لكل قسم.",
        bullets: [
          "قسم القراءة 40% من الدرجة",
          "قسم الكتابة والاستماع 30%",
          "إدارة الوقت وعدم التوقف عند سؤال واحد",
        ],
      },
      {
        id: "v3",
        type: "video",
        title: "استراتيجيات التحضير وخطة 30 يوم",
        duration: "22:10",
        url: "https://cdn.pixabay.com/video/2026/07/31/367684_large.mp4",
        summary:
          "خطة عملية مجربة للوصول من مستوى مبتدئ إلى 85+ خلال شهر واحد فقط عبر التركيز على الكلمات المفتاحية.",
        bullets: [
          "تقنية التكرار المتباعد لحفظ المفردات",
          "جدول مذاكرة يومي 90 دقيقة",
          "أخطاء شائعة تسبب فقدان الدرجات",
        ],
      },
      {
        id: "f1",
        type: "file",
        title: "دليل اختبار STEP الشامل - نسخة 2024",
        size: "4.2 MB",
      },
      {
        id: "q1",
        type: "quiz",
        title: "اختبار تقييم المستوى الأولي",
        questions: 20,
        minutes: 25,
      },
    ],
  },
  {
    id: "s2",
    title: "القسم الثاني: مهارات القراءة والاستيعاب",
    items: [
      {
        id: "v4",
        type: "video",
        title: "تقنية Skimming و Scanning للقراءة السريعة",
        duration: "15:45",
        url: "https://cdn.pixabay.com/video/2026/06/24/360527_large.mp4",
        summary:
          "تعلم كيف تجيب على أسئلة القطع الطويلة في أقل من دقيقتين بدون قراءة القطعة كاملة.",
        bullets: [
          "الفرق بين القراءة السريعة والعميقة",
          "تحديد الجملة المفتاحية",
          "التعامل مع مفردات لا تعرفها",
        ],
      },
      {
        id: "v5",
        type: "video",
        title: "القطع الأكاديمية الطويلة - تفكيك وتحليل",
        duration: "28:30",
        url: "https://cdn.pixabay.com/video/2026/07/10/363199_large.mp4",
        summary:
          "تحليل 3 قطع حقيقية من اختبارات سابقة وكيفية استنتاج الإجابة حتى لو لم تفهم القطعة.",
        bullets: [
          "أنواع أسئلة القراءة الستة",
          "كلمات الربط وتأثيرها على المعنى",
          "تدريب عملي على قطعتين",
        ],
      },
      {
        id: "v6",
        type: "video",
        title: "المفردات السياقية - حفظ 500 كلمة أساسية",
        duration: "19:12",
        url: "https://cdn.pixabay.com/video/2026/06/07/357054_tiny.mp4",
        summary:
          "أهم 500 كلمة تتكرر في 90% من اختبارات STEP مع قصص لسهولة الحفظ.",
        bullets: [
          "قائمة الكلمات الذهبية",
          "طريقة القصة المصورة",
          "اختبار سريع بعد كل 100 كلمة",
        ],
      },
      {
        id: "f2",
        type: "file",
        title: "بنك مفردات STEP - 500 كلمة مع الترجمة",
        size: "1.8 MB",
      },
      {
        id: "q2",
        type: "quiz",
        title: "اختبار قسم القراءة - المستوى المتوسط",
        questions: 25,
        minutes: 30,
      },
    ],
  },
  {
    id: "s3",
    title: "القسم الثالث: الاستماع والقواعد المتقدمة",
    items: [
      {
        id: "v7",
        type: "video",
        title: "مهارات الاستماع - التقاط التفاصيل الدقيقة",
        duration: "21:05",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        summary:
          "تدريب أذنك على اللهجات المختلفة وفهم المحادثات السريعة من المرة الأولى.",
        bullets: [
          "تدريب الـ Shadowing",
          "الكلمات المتشابهة صوتيا",
          "كيف تتعامل مع التشويش",
        ],
      },
      {
        id: "v8",
        type: "video",
        title: "القواعد الذهبية - الأزمنة والشرطيات",
        duration: "26:40",
        url: "https://cdn.pixabay.com/video/2026/03/02/337459_tiny.mp4",
        summary:
          "شرح القواعد التي تأتي في الاختبار فقط، بدون حشو أكاديمي، مع 100 مثال محلول.",
        bullets: [
          "12 زمن فقط يأتي منها 80% من الأسئلة",
          "قاعدة IF بجميع حالاتها",
          "أخطاء القواعد القاتلة",
        ],
      },
      {
        id: "v9",
        type: "video",
        title: "الكتابة والتحليل - بناء جملة احترافية",
        duration: "17:22",
        url: "https://cdn.pixabay.com/video/2026/01/11/327101_tiny.mp4",
        summary:
          "كيف تكتب فقرة متماسكة في قسم الكتابة وتحصل على الدرجة الكاملة بخطوات ثابتة.",
        bullets: [
          "هيكل الفقرة النموذجية",
          "روابط احترافية ترفع تقييمك",
          "تجنب الحشو والتكرار",
        ],
      },
      {
        id: "f3",
        type: "file",
        title: "ملخص قواعد STEP في 10 صفحات",
        size: "2.5 MB",
      },
      {
        id: "q3",
        type: "quiz",
        title: "اختبار الاستماع والقواعد",
        questions: 30,
        minutes: 35,
      },
    ],
  },
  {
    id: "s4",
    title: "القسم الرابع: المحاكاة والاختبار الشامل",
    items: [
      {
        id: "v10",
        type: "video",
        title: "محاكاة كاملة لاختبار STEP - مع الحل",
        duration: "42:15",
        url: "https://cdn.pixabay.com/video/2026/01/08/326677_tiny.mp4",
        summary:
          "نحل معا اختبار كامل 100 سؤال بتوقيت حقيقي مع شرح كل إجابة ولماذا اخترناها.",
        bullets: [
          "محاكاة ظروف الاختبار الحقيقية",
          "تحليل الأخطاء الشائعة",
          "خطة المراجعة النهائية قبل الاختبار",
        ],
      },
      {
        id: "f4",
        type: "file",
        title: "اختبار محاكي مطبوع + نموذج الإجابة",
        size: "3.1 MB",
      },
      {
        id: "q4",
        type: "quiz",
        title: "الاختبار الشامل النهائي - محاكي 100 سؤال",
        questions: 100,
        minutes: 120,
      },
    ],
  },
];

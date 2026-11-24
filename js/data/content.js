/** Static content for the Learn & act hub. */

export const US_INFO = [
  {
    name: 'Good',
    range: '0–50',
    who: 'Everyone',
    eff: 'Air quality is satisfactory, with little or no risk.',
    act: ['A great day to be outdoors', 'Open windows and air out the home'],
  },
  {
    name: 'Moderate',
    range: '51–100',
    who: 'Unusually sensitive people',
    eff: 'Acceptable, though people unusually sensitive to pollution may notice symptoms.',
    act: ['Sensitive people: watch for coughing or breathlessness', 'Prefer parks over roadside routes'],
  },
  {
    name: 'Sensitive',
    range: '101–150',
    who: 'Asthma, heart or lung patients, children, older adults, pregnant women',
    eff: 'Sensitive groups may feel effects; most other people are unlikely to.',
    act: ['Sensitive groups: cut long outdoor exertion', 'Keep inhalers handy', 'Shut windows during rush hour'],
  },
  {
    name: 'Unhealthy',
    range: '151–200',
    who: 'Everyone, sensitive groups more severely',
    eff: 'Anyone may start to feel effects; sensitive groups may feel serious ones.',
    act: ['Avoid long or intense outdoor exercise', 'Wear an N95 outdoors', 'Run a purifier indoors'],
  },
  {
    name: 'Very unhealthy',
    range: '201–300',
    who: 'Everyone',
    eff: 'Health alert: a higher risk of effects for everyone.',
    act: ['Move all activity indoors', 'Keep windows shut and seal the gaps', 'N95 whenever you step out'],
  },
  {
    name: 'Hazardous',
    range: '301–500',
    who: 'Everyone',
    eff: 'Emergency conditions: everyone is likely to be affected.',
    act: ['Stay in one filtered room', 'No outdoor exertion at all', 'Check on older relatives and neighbours'],
  },
];
export const ORGANS = [
  {
    k: 'Lungs',
    i: 'wind',
    t: 'PM2.5 reaches the deepest air sacs of the lungs. It inflames the airways, lowers lung function and sets off asthma and COPD attacks. Long-term exposure is linked to lung cancer, which is why IARC lists outdoor air pollution as a Group 1 carcinogen.',
  },
  {
    k: 'Heart',
    i: 'heart',
    t: 'The finest particles cross into the blood, raising blood pressure and inflammation. Heart attacks, strokes and irregular heartbeats rise after pollution spikes, so heart patients should treat high-AQI days like a heatwave.',
  },
  {
    k: 'Brain',
    i: 'activity',
    t: 'Air pollution raises stroke risk, and a growing body of research links long-term exposure to faster cognitive decline and dementia. High-PM days are also tied to headaches and poorer concentration.',
  },
  {
    k: 'Eyes & skin',
    i: 'eye',
    t: 'Smog irritates the eyes, causing redness, dryness and itching, and makes conjunctivitis worse. Particles and the chemicals on them also stress the skin. Rinse your eyes with clean water rather than rubbing them.',
  },
  {
    k: 'Children',
    i: 'smile',
    t: 'Children breathe more air for their body weight and their lungs are still growing, so the same AQI hits them harder. Long-term exposure is linked to slower lung growth and more asthma. Keep school-run walks off main roads.',
  },
  {
    k: 'Pregnancy',
    i: 'sprout',
    t: 'Exposure during pregnancy is associated with low birth weight and preterm birth. On poor days, limit time outdoors, avoid traffic corridors and sleep in a filtered room.',
  },
];
export const CPCB = [
  { name: 'Good', max: 50, color: '#7FBF95', t: 'Minimal impact' },
  { name: 'Satisfactory', max: 100, color: '#B8D98A', t: 'Minor breathing discomfort for sensitive people' },
  {
    name: 'Moderate',
    max: 200,
    color: '#EBD58A',
    t: 'Discomfort for people with asthma or heart disease, children and older adults',
  },
  { name: 'Poor', max: 300, color: '#EDB98A', t: 'Breathing discomfort for most people on prolonged exposure' },
  { name: 'Very Poor', max: 400, color: '#E39A96', t: 'Respiratory illness on prolonged exposure' },
  { name: 'Severe', max: 500, color: '#8E5160', t: 'Affects healthy people; serious for those with existing disease' },
];
export const GRAP = [
  {
    stage: 'Stage I',
    label: 'Poor',
    range: '201–300',
    min: 201,
    m: [
      'Dust control at construction sites; large unregistered sites stopped',
      'Ban on open burning of garbage and biomass',
      'PUC checks and action on visibly polluting vehicles',
      'Restrictions on diesel generator use',
      'Firecracker rules enforced',
    ],
  },
  {
    stage: 'Stage II',
    label: 'Very Poor',
    range: '301–400',
    min: 301,
    m: [
      'Daily mechanical sweeping and water sprinkling on roads',
      'Coal and firewood banned in hotel and restaurant tandoors',
      'Higher parking fees to discourage private cars',
      'More bus and metro services',
      'Stricter limits on diesel generators',
    ],
  },
  {
    stage: 'Stage III',
    label: 'Severe',
    range: '401–450',
    min: 401,
    m: [
      'Non-essential construction and demolition halted',
      'BS-III petrol and BS-IV diesel cars restricted in Delhi-NCR',
      'Stone crushers and mining closed',
      'Primary classes may move to hybrid mode',
    ],
  },
  {
    stage: 'Stage IV',
    label: 'Severe+',
    range: '450+',
    min: 451,
    m: [
      'Truck entry into Delhi stopped, except essential, CNG and electric',
      'Even public infrastructure construction halted',
      'Schools may shift to hybrid or online classes',
      'Governments may order 50% work from home',
    ],
  },
];
export const TIPS = [
  {
    c: 'Ventilate smart',
    id: 'vent',
    t: 'Air out during the cleanest hour',
    h: 'Open windows for 10–15 minutes when the forecast dips, often mid-afternoon in Indian winters. Keep them shut the rest of the time.',
    cost: 'Free',
  },
  {
    c: 'Ventilate smart',
    id: 'chimney',
    t: 'Run the kitchen exhaust every time you cook',
    h: 'Frying and tadka can spike indoor PM2.5 several-fold. Run the chimney during cooking and for 10 minutes after.',
    cost: 'Free',
  },
  {
    c: 'Filter the air',
    id: 'hepa',
    t: 'Run a HEPA purifier in the bedroom',
    h: 'Size it with the calculator. Close the door, run it on high for 30 minutes, then on medium through the night.',
    cost: '₹₹',
  },
  {
    c: 'Filter the air',
    id: 'boxfan',
    t: 'Build a DIY box-fan filter',
    h: 'Tape a MERV-13 filter to the back of a box or table fan, or make a cube of four filters. It works surprisingly well for the cost.',
    cost: '₹',
  },
  {
    c: 'Filter the air',
    id: 'acfilter',
    t: 'Clean AC filters every two weeks in smog season',
    h: 'Dusty filters recirculate particles and cut airflow. Rinse, dry fully, and refit.',
    cost: 'Free',
  },
  {
    c: 'Cut indoor sources',
    id: 'incense',
    t: 'Skip incense, dhoop and mosquito coils',
    h: 'In lab tests a single mosquito coil gave off as much fine particulate as dozens of cigarettes. Use nets or plug-in repellents instead.',
    cost: 'Free',
  },
  {
    c: 'Cut indoor sources',
    id: 'smoke',
    t: 'Keep the home smoke-free',
    h: 'Tobacco smoke is the biggest indoor PM2.5 source where it is present, and it lingers on fabrics.',
    cost: 'Free',
  },
  {
    c: 'Cut indoor sources',
    id: 'mop',
    t: 'Wet-mop instead of dry sweeping',
    h: 'Dry brooms throw settled dust back into the air. Damp mopping and microfibre cloths trap it.',
    cost: 'Free',
  },
  {
    c: 'Seal & monitor',
    id: 'seal',
    t: 'Seal gaps around windows and doors',
    h: 'Use foam weather-strip or draft tape, or a rolled wet towel on the worst days.',
    cost: '₹',
  },
  {
    c: 'Seal & monitor',
    id: 'shoes',
    t: 'Leave shoes at the door',
    h: 'Shoes track in road dust that gets kicked back into the air.',
    cost: 'Free',
  },
  {
    c: 'Seal & monitor',
    id: 'monitor',
    t: 'Get a low-cost PM2.5 monitor',
    h: 'Indoor readings tell you whether your purifier and sealing are actually working.',
    cost: '₹₹',
  },
  {
    c: 'Seal & monitor',
    id: 'plants',
    t: 'Keep plants for joy, not filtration',
    h: 'Houseplants barely remove PM2.5. You would need hundreds per room to match one small purifier.',
    cost: 'Free',
  },
];
export const MYTHS = [
  {
    m: 'Indoor plants clean polluted air.',
    f: 'A 2019 review found you would need 10–1,000 plants per square metre to match normal ventilation. A purifier does far more.',
  },
  {
    m: 'Any mask protects you from smog.',
    f: 'Cloth and loose surgical masks leak around the edges. A well-fitted N95 or FFP2 filters at least 95% of fine particles.',
  },
  {
    m: "Indoors, I'm safe from pollution.",
    f: 'Without filtration, indoor PM2.5 often runs at half to most of outdoor levels, and cooking, incense and coils add more.',
  },
  {
    m: 'A morning walk is always healthiest.',
    f: 'In winter, cold still mornings trap pollution near the ground, so the afternoon is often cleaner. Check the forecast chart.',
  },
  {
    m: "If I can't see smog, the air is clean.",
    f: 'PM2.5 is invisible at harmful levels. Haze shows only when it is already bad, so check the AQI.',
  },
  {
    m: 'Rain washes all pollution away.',
    f: 'Light drizzle does little for fine particles. Heavy, sustained rain helps, but only briefly.',
  },
  {
    m: 'An air purifier removes every pollutant.',
    f: 'HEPA traps particles, not gases like NO₂ or CO. Activated carbon helps with odours and gases, and so does ventilating at clean hours.',
  },
  {
    m: 'Pollution only matters for people who are already ill.',
    f: 'Long-term PM2.5 exposure raises heart, lung and stroke risk in healthy adults too.',
  },
  {
    m: "Short exposures don't matter.",
    f: 'Hours on bad-air days add up. Cutting peak exposure, such as hard exercise during rush hour, makes a real difference.',
  },
];

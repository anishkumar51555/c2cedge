export const products = [
  { id: 'AP-100', name: 'Air purifier', subtitle: 'PureAir · AP-100', category: 'Home & living', price: 7999, stock: 48, moq: 4, pack: 'Case of 4', tone: 'lavender', shape: 'purifier', tag: 'Bestseller' },
  { id: 'SK-200', name: 'Smart kettle', subtitle: 'Forma · SK-200', category: 'Kitchen', price: 2499, stock: 120, moq: 6, pack: 'Case of 6', tone: 'peach', shape: 'kettle', tag: 'New arrival' },
  { id: 'MG-300', name: 'Mixer grinder', subtitle: 'Forma · MG-300', category: 'Kitchen', price: 3999, stock: 36, moq: 4, pack: 'Case of 4', tone: 'mint', shape: 'mixer', tag: '' },
  { id: 'LB-110', name: 'Linen bedding set', subtitle: 'Sunday Home · LB-110', category: 'Home & living', price: 3299, stock: 72, moq: 2, pack: 'Case of 2', tone: 'sky', shape: 'linen', tag: 'Staff pick' },
  { id: 'BT-410', name: 'Stoneware mug set', subtitle: 'Sunday Home · BT-410', category: 'Kitchen', price: 899, stock: 240, moq: 12, pack: 'Case of 12', tone: 'rose', shape: 'mugs', tag: '' },
  { id: 'LT-520', name: 'Arc table lamp', subtitle: 'Luma · LT-520', category: 'Home & living', price: 2199, stock: 54, moq: 4, pack: 'Case of 4', tone: 'butter', shape: 'lamp', tag: '' },
]

export const seedOrders = [
  { id: 'OD-2841', placed: 'Oct 28, 2026', status: 'In transit', delivery: 'Nov 2 – Nov 4', subtotal: 62986, discount: 3149, total: 59837, lines: [{ id: 'AP-100', quantity: 4 }, { id: 'SK-200', quantity: 6 }, { id: 'MG-300', quantity: 4 }], invoice: 'INV-2841' },
  { id: 'OD-2798', placed: 'Oct 21, 2026', status: 'Delivered', delivery: 'Oct 25, 2026', subtotal: 31392, discount: 0, total: 31392, lines: [{ id: 'AP-100', quantity: 2 }, { id: 'LB-110', quantity: 2 }, { id: 'LT-520', quantity: 4 }], invoice: 'INV-2798' },
  { id: 'OD-2732', placed: 'Oct 14, 2026', status: 'Processing', delivery: 'Nov 3 – Nov 5', subtotal: 36570, discount: 0, total: 36570, lines: [{ id: 'BT-410', quantity: 24 }, { id: 'SK-200', quantity: 6 }], invoice: 'INV-2732' },
  { id: 'OD-2665', placed: 'Oct 5, 2026', status: 'Delivered', delivery: 'Oct 9, 2026', subtotal: 35580, discount: 0, total: 35580, lines: [{ id: 'MG-300', quantity: 4 }, { id: 'LT-520', quantity: 4 }, { id: 'BT-410', quantity: 12 }], invoice: 'INV-2665' },
]

export type DefaultQuizQuestion = {
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  correct_choice: 'A' | 'B' | 'C' | 'D'
  points: number
  explanation: string
}

export const DEFAULT_ORTHOGRAPHIC_QUESTIONS: DefaultQuizQuestion[] = [
  {
    question_text: 'ภาพฉายที่มองชิ้นงานตรงจากด้านหน้าเรียกว่าอะไร?',
    choice_a: 'Front View',
    choice_b: 'Top View',
    choice_c: 'Right View',
    choice_d: 'Bottom View',
    correct_choice: 'A',
    points: 1,
    explanation: 'Front View คือภาพที่ได้จากการมองชิ้นงานตรงจากด้านหน้า',
  },
  {
    question_text: 'ภาพฉายที่มองชิ้นงานจากด้านบนลงมาเรียกว่าอะไร?',
    choice_a: 'Front View',
    choice_b: 'Top View',
    choice_c: 'Right View',
    choice_d: 'Rear View',
    correct_choice: 'B',
    points: 1,
    explanation: 'Top View คือภาพที่ได้จากการมองชิ้นงานจากด้านบนลงมา',
  },
  {
    question_text: 'ภาพ Right View เกิดจากการมองชิ้นงานจากด้านใด?',
    choice_a: 'ด้านหน้า',
    choice_b: 'ด้านบน',
    choice_c: 'ด้านขวา',
    choice_d: 'ด้านล่าง',
    correct_choice: 'C',
    points: 1,
    explanation: 'Right View คือภาพที่มองชิ้นงานจากด้านขวา',
  },
  {
    question_text: 'จุดประสงค์สำคัญของ Orthographic Projection คือข้อใด?',
    choice_a: 'แสดงวัตถุ 3 มิติด้วยภาพ 2 มิติหลายด้าน',
    choice_b: 'สร้างภาพให้เหมือนภาพถ่ายมากที่สุด',
    choice_c: 'แสดงสีและพื้นผิวของวัตถุ',
    choice_d: 'สร้างภาพเคลื่อนไหวของชิ้นงาน',
    correct_choice: 'A',
    points: 1,
    explanation: 'Orthographic Projection ใช้หลายมุมมองสองมิติเพื่อสื่อรูปร่างและขนาดของวัตถุสามมิติ',
  },
  {
    question_text: 'ในการฉายภาพแบบ First-angle ตำแหน่งใดอยู่ระหว่างผู้มองกับระนาบฉาย?',
    choice_a: 'วัตถุ',
    choice_b: 'ระนาบฉาย',
    choice_c: 'เส้นบอกขนาด',
    choice_d: 'กรอบกระดาษ',
    correct_choice: 'A',
    points: 1,
    explanation: 'First-angle Projection วางวัตถุไว้ระหว่างผู้มองกับระนาบฉาย',
  },
  {
    question_text: 'ในการฉายภาพแบบ Third-angle สิ่งใดอยู่ระหว่างผู้มองกับวัตถุ?',
    choice_a: 'วัตถุอีกชิ้นหนึ่ง',
    choice_b: 'ระนาบฉาย',
    choice_c: 'เส้นศูนย์กลาง',
    choice_d: 'เส้นบอกขนาด',
    correct_choice: 'B',
    points: 1,
    explanation: 'Third-angle Projection มีระนาบฉายอยู่ระหว่างผู้มองกับวัตถุ',
  },
  {
    question_text: 'หากต้องการดูมิติความกว้างและความลึกของชิ้นงาน ควรพิจารณาภาพใดเป็นหลัก?',
    choice_a: 'Front View',
    choice_b: 'Top View',
    choice_c: 'Right View',
    choice_d: 'Rear View',
    correct_choice: 'B',
    points: 1,
    explanation: 'Top View โดยทั่วไปแสดงความกว้างและความลึกของชิ้นงาน',
  },
  {
    question_text: 'หากต้องการดูมิติความสูงและความลึกของชิ้นงาน ควรพิจารณาภาพใดเป็นหลัก?',
    choice_a: 'Top View',
    choice_b: 'Front View',
    choice_c: 'Right View',
    choice_d: 'Bottom View',
    correct_choice: 'C',
    points: 1,
    explanation: 'Right View โดยทั่วไปแสดงความสูงและความลึกของชิ้นงาน',
  },
  {
    question_text: 'ข้อใดเป็นชุดภาพฉายพื้นฐานที่ใช้บ่อยในการเขียนแบบ?',
    choice_a: 'Front View, Top View และ Right View',
    choice_b: 'Front View, Bottom View และ Rear View',
    choice_c: 'Top View, Bottom View และ Rear View',
    choice_d: 'Left View, Right View และ Bottom View',
    correct_choice: 'A',
    points: 1,
    explanation: 'Front View, Top View และ Right View เป็นชุดมุมมองพื้นฐานที่ใช้บ่อย',
  },
  {
    question_text: 'ก่อนเริ่มเขียนภาพฉาย ควรเลือก Front View ตามหลักใด?',
    choice_a: 'เลือกด้านที่แสดงรูปร่างและรายละเอียดสำคัญได้ชัดเจน',
    choice_b: 'เลือกด้านที่มีพื้นที่ว่างมากที่สุด',
    choice_c: 'เลือกด้านที่วาดเส้นน้อยที่สุดเสมอ',
    choice_d: 'เลือกด้านใดก็ได้โดยไม่ต้องพิจารณารูปร่าง',
    correct_choice: 'A',
    points: 1,
    explanation: 'Front View ควรเป็นด้านที่สื่อรูปร่างและรายละเอียดสำคัญของชิ้นงานได้ดีที่สุด',
  },
]

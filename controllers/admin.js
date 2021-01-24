const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'cumsdbms',
});

// ADMIN REGISTER ==> To be commented
exports.getRegister = (req, res, next) => {
  res.render('Admin/register');
};

exports.postRegister = async (req, res, next) => {
  const { name, email, password, confirmPassword } = req.body;

  let errors = [];

  if (password !== confirmPassword) {
    errors.push({ msg: 'Passwords do not match' });
    return res.render('Admin/register', { errors });
  }
  db.query(
    'SELECT EMAIL FROM ADMIN WHERE EMAIL = ?',
    [email],
    async (error, results) => {
      if (error) {
        throw error;
      }
      if (results.length > 0) {
        errors.push({ msg: 'That email is already in use' });
        return res.render('Admin/register', { errors });
      }
      let hashedPassword = await bcrypt.hash(password, 8);
      db.query(
        'INSERT INTO ADMIN SET ?',
        {
          name: name,
          email: email,
          password: hashedPassword,
        },
        async (error, results) => {
          if (error) {
            throw error;
          }
          req.flash('success_msg', 'You are now registered and can log in');
          return res.redirect('/admin/login');
        }
      );
    }
  );
};

exports.getLogin = (req, res, next) => {
  res.render('Admin/login');
};

exports.postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let errors = [];

    let sql3 = 'SELECT * FROM admin WHERE email = ?';
    db.query(sql3, [email], async (err, results) => {
      if (
        results.length === 0 ||
        !(await bcrypt.compare(password, results[0].password))
      ) {
        errors.push({ msg: 'Email or Password is Incorrect' });
        res.status(401).render('Admin/login', { errors });
      } else {
        const user = results[0];
        const token = jwt.sign({ id: user.admin_id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRE,
        });

        res.cookie('jwt', token, {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
        });
        res.redirect('/admin/dashboard');
      }
    });
  } catch (err) {
    throw err;
  }
};

exports.getDashboard = (req, res, next) => {
  let sql4 = 'SELECT * FROM admin WHERE admin_id = ?';
  db.query(sql4, [req.user], (err, result) => {
    if (err) throw err;
    res.render('Admin/dashboard', { user: result[0], page_name: 'overview' });
  });
};

exports.getLogout = (req, res, next) => {
  res.cookie('jwt', '', { maxAge: 1 });
  req.flash('success_msg', 'You are logged out');
  res.redirect('/admin/login');
};

// STAFFS
exports.getStaff = (req, res, next) => {
  const sql1 = 'SELECT * FROM staff';
  db.query(sql1, (err, results) => {
    if (err) throw err;
    else {
      res.render('Admin/Staff/getStaff', { data: results, page_name: 'staff' });
    }
  });
};

exports.getAddStaff = (req, res, next) => {
  const sql1 = 'SELECT * from department';
  db.query(sql1, (err, results) => {
    if (err) {
      throw err;
    }
    let departments = [];
    for (let i = 0; i < results.length; ++i) {
      departments.push(results[i].dept_id);
    }
    res.render('Admin/Staff/addStaff', {
      departments: departments,
      page_name: 'staff'
    });
  });
};

exports.postAddStaff = (req, res, next) => {
  const sql1 = 'SELECT * from staff where email = ?';
  db.query(sql1, [req.body.email], (err, results) => {
    if (err) {
      console.log(err);
    }
    if (results.length !== 0) {
      req.flash('error', 'Staff with that email already exists');
      res.redirect('/admin/addStaff');
    } else {
      const {
        email,
        dob,
        name,
        gender,
        department,
        address,
        city,
        postalCode,
        contact,
      } = req.body;

      const sql2 = 'INSERT INTO staff SET ?';
      db.query(
        sql2,
        {
          st_name: name,
          gender: gender,
          dob: dob,
          email: email,
          st_address: address + '-' + city + '-' + postalCode,
          contact: contact,
          dept_id: department,
          password: email,
        },
        (err, results) => {
          if (err) {
            throw err;
          }
          req.flash('success_msg', 'Staff added successfully');
          res.redirect('/admin/getStaff');
        }
      );
    }
  });
};

// CLASSES
exports.getAddClass = (req, res, next) => {
  res.render('Admin/Class/addClass', { page_name: 'classes' });
};

// STUDENTS
exports.getAddStudent = (req, res, next) => {
  res.render('Admin/Student/addStudent', { page_name: 'students' });
};

// DEPARTMENTS
exports.getDept = (req, res, next) => {
  const sql1 = 'SELECT * FROM department';

  db.query(sql1, (err, results) => {
    if (err) throw err;
    else {
      res.render('Admin/Department/getDept', { data: results, page_name: 'depts' });
    }
  });
};

exports.getAddDept = (req, res, next) => {
  res.render('Admin/Department/addDept', { page_name: 'depts' });
};

exports.postAddDept = async (req, res, next) => {
  const deptName = req.body.department;
  const deptId = req.body.deptId;

  const sql2 = 'SELECT * from department where dept_id = ? or d_name = ?';
  db.query(sql2, [deptId, deptName], (err, results) => {
    if (err) {
      throw err;
    }
    if (results.length !== 0) {
      req.flash('error', 'Department with that name or id already exists');
      return res.redirect('/admin/addDept');
    } else {
      const sql3 = 'INSERT INTO department SET ?';
      db.query(sql3, { dept_id: deptId, d_name: deptName }, (err, results) => {
        if (err) throw err;
        else {
          req.flash('success_msg', 'Department added successfully');
          res.redirect('/admin/getDept');
        }
      });
    }
  });
};

exports.getDeptSettings = (req, res, next) => {
  const deptId = req.params.id;
  const sql1 = 'SELECT * FROM department WHERE dept_id = ?';

  db.query(sql1, [deptId], (err, results) => {
    if (err) throw err;
    else {
      // console.log(results);
      res.render('Admin/Department/setDept', {
        name: results[0].d_name,
        id: results[0].dept_id,
        page_name: 'depts'
      });
    }
  });
};

exports.postDeptSettings = (req, res, next) => {
  const { department, deptId } = req.body;

  const sql1 = 'UPDATE department SET d_name = ? WHERE dept_id = ?';
  db.query(sql1, [department, deptId], (err, results) => {
    if (err) throw err;
    else {
      req.flash('success_msg', 'Department changed successfully!');
      res.redirect('/admin/getDept');
    }
  });
};

// COURSE
exports.getRelevantCourse = (req, res, next) => {
  const sql1 = 'SELECT * from department';
  db.query(sql1, (err, results) => {
    if (err) {
      throw err;
    }
    let departments = [];
    for (let i = 0; i < results.length; ++i) {
      departments.push(results[i].dept_id);
    }
    res.render('Admin/Course/deptSelect', {
      departments: departments,
      page_name: 'courses'
    });
  });
};

exports.postRelevantCourse = (req, res, next) => {
  let { semester, department } = req.body;
  semester = parseInt(semester);
  if (!semester && department === 'None') {
    const sql1 = 'SELECT * FROM course';
    db.query(sql1, (err, results) => {
      if (err) throw err;
      else {
        res.render('Admin/Course/getCourse', { data: results, page_name: 'courses' });
      }
    });
  } else if (!semester) {
    const sql2 = 'SELECT * FROM course WHERE dept_id = ?';
    db.query(sql2, [department], (err, results) => {
      if (err) throw err;
      else {
        res.render('Admin/Course/getCourse', { data: results, page_name: 'courses' });
      }
    });
  } else if (department === 'None') {
    const sql2 = 'SELECT * FROM course WHERE semester = ?';
    db.query(sql2, [semester], (err, results) => {
      if (err) throw err;
      else {
        res.render('Admin/Course/getCourse', { data: results, page_name: 'courses' });
      }
    });
  } else if (semester && department !== 'None') {
    const sql2 =
      'SELECT * FROM course WHERE semester = ? AND dept_id = ? GROUP BY c_id';
    db.query(sql2, [semester, department], (err, results) => {
      if (err) throw err;
      else {
        res.render('Admin/Course/getCourse', { data: results, page_name: 'courses' });
      }
    });
  }
};

exports.getAddCourse = (req, res, next) => {
  const sql1 = 'SELECT * from department';
  db.query(sql1, (err, results) => {
    if (err) {
      throw err;
    }
    let departments = [];
    for (let i = 0; i < results.length; ++i) {
      departments.push(results[i].dept_id);
    }
    res.render('Admin/Course/addCourse', {
      departments: departments,
      page_name: 'courses'
    });
  });
};

exports.getAllCourse = (req, res, next) => {
  const sql1 = 'SELECT * FROM course';
  db.query(sql1, (err, results) => {
    if (err) throw err;
    else {
      res.render('Admin/Course/getCourse', { data: results, page_name: 'courses' });
    }
  });
};

exports.postAddCourse = async (req, res, next) => {
  let { course, semester, department, credits, c_type } = req.body;
  semester = parseInt(semester);
  credits = parseInt(credits);
  let year = parseInt((semester + 1) / 2);
  let sql1 = 'INSERT INTO course SET ?';

  const sql2 = 'SELECT COUNT(dept_id) AS size FROM course WHERE dept_id = ?';

  db.query(sql2, department, (err, results) => {
    if (err) throw err;
    else {
      let size = results[0].size + 1;
      const c_id = department + size;
      db.query(
        sql1,
        {
          c_id,
          semester: semester,
          year: year,
          name: course,
          c_type: c_type,
          credits: credits,
          dept_id: department,
        },
        (err, results) => {
          if (err) {
            throw err;
          }
          req.flash('success_msg', 'Course added successfully');
          return res.redirect('/admin/getAllCourses');
        }
      );
    }
  });
};

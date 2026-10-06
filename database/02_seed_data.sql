-- 02_seed_data.sql
-- Sample data for testing. Run it right after 01_create_database.sql.
-- Every sample account has the password:  Password@123

USE FacilityBookingDB;
SET NAMES utf8mb4;   -- keeps Vietnamese names correct

-- bcrypt hash of "Password@123"
SET @pw = '$2b$10$0mApOVt3qqMrUwL0lzw5h.j4By67pEJwyY2.uIvUfp2y/nB43o4Em';

-- users: id 1..5   (university email: name letters + student code, e.g. anhnq2410071@usth.edu.vn)
INSERT INTO users (name, email, password, role) VALUES
    ('System Admin',    'admin@usth.edu.vn',          @pw, 'ADMIN'),
    ('Đỗ Trung Huy',    'huydt@usth.edu.vn',          @pw, 'TEACHER'),
    ('Phạm Thu Hà',     'hapt@usth.edu.vn',           @pw, 'STAFF'),
    ('Trần Thị An',     'antt2410071@usth.edu.vn',    @pw, 'STUDENT'),
    ('Lê Minh Bình',    'binhlm2410072@usth.edu.vn',  @pw, 'STUDENT');

-- facility_categories: id 1..6
INSERT INTO facility_categories (name, description, allowed_roles) VALUES
    ('Study Room',           'Rooms for group study',               'STUDENT,TEACHER,STAFF'),
    ('Meeting Room',         'Rooms for team meetings',             'STUDENT,TEACHER,STAFF'),
    ('Teacher Meeting Room', 'Meeting rooms for teachers only',     'TEACHER'),
    ('Laboratory',           'Science and engineering labs',        'STUDENT,TEACHER'),
    ('Computer Room',        'Rooms with computers',                'STUDENT,TEACHER,STAFF'),
    ('Sports Room',          'Indoor sports facilities',            'STUDENT,TEACHER,STAFF');

-- facilities: id 1..7
-- allowed_roles = NULL  -> the room follows its room type
-- allowed_roles = 'TEACHER' -> only teachers can book THIS room
-- image_url: any picture link. If it does not load, the card shows a coloured box instead.
INSERT INTO facilities (category_id, name, location, capacity, description, equipment, image_url, allowed_roles, status) VALUES
    (1, 'Study Room A101',     'Building A, Floor 1', 8,   'Quiet room for group study, whiteboard and a TV for slides', 'Whiteboard, TV',          'https://picsum.photos/seed/study-a101/640/400',  NULL,            'AVAILABLE'),
    (1, 'Study Room A102',     'Building A, Floor 1', 6,   'Small study room for a team of up to six',                   'Whiteboard',              'https://picsum.photos/seed/study-a102/640/400',  NULL,            'AVAILABLE'),
    (2, 'Meeting Room B201',   'Building B, Floor 2', 15,  'Room for club and project meetings, projector and speakers', 'Projector, Speakers',     'https://picsum.photos/seed/meeting-b201/640/400', NULL,           'AVAILABLE'),
    (3, 'Teacher Room C301',   'Building C, Floor 3', 20,  'Faculty meeting room with video-call equipment',             'Projector, Video call',   'https://picsum.photos/seed/teacher-c301/640/400', NULL,           'AVAILABLE'),
    (4, 'Chemistry Lab D101',  'Building D, Floor 1', 30,  'Chemistry laboratory with fume hoods and lab benches',       'Fume hoods, Lab benches', 'https://picsum.photos/seed/chem-d101/640/400',   'TEACHER',       'AVAILABLE'),
    (5, 'Computer Room E201',  'Building E, Floor 2', 40,  '40 PCs with Windows 11, used for practical classes',         '40 PCs, Projector',       'https://picsum.photos/seed/computer-e201/640/400', 'TEACHER,STAFF', 'AVAILABLE'),
    (6, 'Badminton Hall F001', 'Sports Center',       12,  'Two badminton courts with nets and rackets',                 'Nets, Rackets',           'https://picsum.photos/seed/badminton-f001/640/400', NULL,          'UNAVAILABLE');

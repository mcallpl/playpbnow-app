import React, { useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_SEMIBOLD } from '../../constants/theme';
import { BrandedIcon } from '../../components/BrandedIcon';
import { HELP_TOPICS, HelpTopic } from '../../utils/helpContent';

// Component to render markdown **bold** text
interface MarkdownTextProps {
  text: string;
  style?: any;
  boldStyle?: any;
  numberOfLines?: number;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ text, style, boldStyle, numberOfLines }) => {
  const parts: (React.ReactNode)[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  let partIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the bold part
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`text-${partIndex}`} style={style}>
          {text.substring(lastIndex, match.index)}
        </Text>
      );
      partIndex++;
    }
    // Add the bold part
    parts.push(
      <Text key={`bold-${partIndex}`} style={[style, boldStyle, { fontFamily: FONT_BODY_SEMIBOLD }]}>
        {match[1]}
      </Text>
    );
    partIndex++;
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <Text key={`text-${partIndex}`} style={style}>
        {text.substring(lastIndex)}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.length > 0 ? parts : text}
    </Text>
  );
};

export default function HelpScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Match Management', 'Beacons']));

  // Group topics by category
  const topicsByCategory = useMemo(() => {
    const grouped: { [key: string]: HelpTopic[] } = {};
    HELP_TOPICS.forEach((topic) => {
      if (!grouped[topic.category]) {
        grouped[topic.category] = [];
      }
      grouped[topic.category].push(topic);
    });
    return grouped;
  }, []);

  // Filter topics based on search
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) {
      return topicsByCategory;
    }

    const query = searchQuery.toLowerCase();
    const filtered: { [key: string]: HelpTopic[] } = {};

    Object.entries(topicsByCategory).forEach(([category, topics]) => {
      const matchingTopics = topics.filter((topic) =>
        topic.title.toLowerCase().includes(query) ||
        topic.searchKeywords.some((kw) => kw.includes(query)) ||
        topic.content.toLowerCase().includes(query)
      );

      if (matchingTopics.length > 0) {
        filtered[category] = matchingTopics;
      }
    });

    return filtered;
  }, [searchQuery, topicsByCategory]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // List View - Browse Topics
  if (!selectedTopic) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Help & Directions</Text>
          <Text style={styles.headerSubtitle}>Complete guide to using PlayPBNow</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <BrandedIcon name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help topics..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <BrandedIcon name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Topics List */}
        <ScrollView
          style={styles.topicsList}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {Object.entries(filteredTopics).map(([category, topics]) => (
            <View key={category} style={styles.categorySection}>
              {/* Category Header */}
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <View style={styles.categoryTitleContainer}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <Text style={styles.topicCount}>{topics.length}</Text>
                </View>
                <BrandedIcon
                  name={expandedCategories.has(category) ? 'checkmarkCircle' : 'chevronDown'}
                  size={24}
                  color={colors.accent}
                />
              </TouchableOpacity>

              {/* Topics in Category */}
              {expandedCategories.has(category) && (
                <View style={styles.topicsInCategory}>
                  {topics.map((topic, idx) => (
                    <TouchableOpacity
                      key={topic.id}
                      style={[
                        styles.topicItem,
                        idx === topics.length - 1 && styles.topicItemLast,
                      ]}
                      onPress={() => setSelectedTopic(topic)}
                    >
                      <View style={styles.topicContent}>
                        <MarkdownText text={topic.title} style={styles.topicTitle} boldStyle={{ fontFamily: FONT_BODY_SEMIBOLD }} />
                        <MarkdownText text={topic.content.split('\n')[0]} style={styles.topicPreview} boldStyle={{ fontFamily: FONT_BODY_SEMIBOLD }} numberOfLines={1} />
                      </View>
                      <BrandedIcon
                        name="chevronRight"
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}

          {Object.keys(filteredTopics).length === 0 && (
            <View style={styles.noResults}>
              <BrandedIcon name="search" size={48} color={colors.textMuted} />
              <Text style={styles.noResultsText}>No topics found</Text>
              <Text style={styles.noResultsSubtext}>Try a different search term</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Detail View - Read Topic
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header with Back Button */}
      <View style={styles.detailHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedTopic(null)}
        >
          <BrandedIcon name="chevronLeft" size={24} color={colors.accent} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.categoryBadge}>{selectedTopic.category}</Text>
      </View>

      {/* Topic Title */}
      <View style={styles.topicHeader}>
        <MarkdownText text={selectedTopic.title} style={styles.topicDetailTitle} boldStyle={{ fontFamily: FONT_BODY_SEMIBOLD }} />
      </View>

      {/* Topic Content */}
      <ScrollView
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <MarkdownText text={selectedTopic.content} style={styles.topicDetailContent} boldStyle={{ fontFamily: FONT_BODY_SEMIBOLD }} />

        {/* Related Topics */}
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>More in {selectedTopic.category}</Text>
          <View style={styles.relatedTopics}>
            {HELP_TOPICS.filter(
              (t) => t.category === selectedTopic.category && t.id !== selectedTopic.id
            )
              .slice(0, 3)
              .map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.relatedItem}
                  onPress={() => setSelectedTopic(topic)}
                >
                  <View style={{ flex: 1 }}>
                    <MarkdownText text={topic.title} style={styles.relatedItemText} boldStyle={{ fontFamily: FONT_BODY_SEMIBOLD }} />
                    <MarkdownText text={topic.content.split('\n')[0]} style={styles.relatedItemPreview} boldStyle={{ fontFamily: FONT_BODY_SEMIBOLD }} numberOfLines={1} />
                  </View>
                  <BrandedIcon name="chevronRight" size={16} color={colors.accent} />
                </TouchableOpacity>
              ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      color: c.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 13,
      fontFamily: FONT_BODY_REGULAR,
      color: c.textMuted,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.surfaceLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: FONT_BODY_REGULAR,
      color: c.text,
      padding: 0,
    },
    topicsList: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    categorySection: {
      marginBottom: 8,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: c.surfaceLight,
      borderRadius: 10,
      marginBottom: 4,
    },
    categoryTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryTitle: {
      fontSize: 16,
      fontFamily: FONT_BODY_SEMIBOLD,
      color: c.text,
    },
    topicCount: {
      fontSize: 13,
      fontFamily: FONT_BODY_MEDIUM,
      color: c.textMuted,
      backgroundColor: c.bg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    topicsInCategory: {
      marginBottom: 12,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.border,
    },
    topicItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    topicItemLast: {
      borderBottomWidth: 0,
    },
    topicContent: {
      flex: 1,
      marginRight: 12,
    },
    topicTitle: {
      fontSize: 15,
      fontFamily: FONT_BODY_SEMIBOLD,
      color: c.text,
      marginBottom: 3,
    },
    topicPreview: {
      fontSize: 12,
      fontFamily: FONT_BODY_REGULAR,
      color: c.textMuted,
    },
    noResults: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 12,
    },
    noResultsText: {
      fontSize: 16,
      fontFamily: FONT_BODY_SEMIBOLD,
      color: c.text,
    },
    noResultsSubtext: {
      fontSize: 13,
      fontFamily: FONT_BODY_REGULAR,
      color: c.textMuted,
    },
    // Detail view styles
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backText: {
      fontSize: 15,
      fontFamily: FONT_BODY_SEMIBOLD,
      color: c.accent,
    },
    categoryBadge: {
      fontSize: 12,
      fontFamily: FONT_BODY_SEMIBOLD,
      color: c.accent,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    topicHeader: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    topicDetailTitle: {
      fontSize: 24,
      fontFamily: FONT_DISPLAY_BOLD,
      color: c.text,
    },
    contentScroll: {
      flex: 1,
    },
    topicDetailContent: {
      fontSize: 14,
      fontFamily: FONT_BODY_REGULAR,
      color: c.text,
      lineHeight: 22,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    relatedSection: {
      marginTop: 28,
      paddingHorizontal: 20,
    },
    relatedTitle: {
      fontSize: 14,
      fontFamily: FONT_BODY_SEMIBOLD,
      color: c.textMuted,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    relatedTopics: {
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: c.surfaceLight,
      borderWidth: 1,
      borderColor: c.border,
    },
    relatedItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    relatedItemText: {
      fontSize: 13,
      fontFamily: FONT_BODY_MEDIUM,
      color: c.text,
      flex: 1,
    },
    relatedItemPreview: {
      fontSize: 11,
      fontFamily: FONT_BODY_REGULAR,
      color: c.textMuted,
      marginTop: 2,
    },
    bottomPadding: {
      height: 40,
    },
  });
